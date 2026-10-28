use crate::{
    files::{HtmlSource, MAX_BYTES},
    policy::{
        is_registration_url, is_schedule_url, upgrade_registration_url, validate_bounds, Bounds,
    },
    state::Status,
    DesktopState,
};
use serde::Deserialize;
use std::sync::Mutex;
use tauri::webview::{NewWindowResponse, PermissionResponse, WebviewBuilder};
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Webview, WebviewUrl};
const URL: &str = "https://unitreg.utar.edu.my/portal/courseRegStu/login.jsp";
const SCRIPT: &str = include_str!("../../dist-tauri/native-registration.js");

pub async fn open(app: &AppHandle) -> Result<(), String> {
    if app.get_webview("registration").is_some() {
        return Ok(());
    }
    let state = app.state::<DesktopState>().registration.clone();
    {
        let mut s = state
            .lock()
            .map_err(|_| "Registration state is unavailable.")?;
        if s.creating {
            return Ok(());
        }
        s.creating = true;
        s.status.loading = true;
    }
    let result = (|| -> Result<(), String> {
        let window = app
            .get_window("main")
            .ok_or("The planner window is unavailable.")?;
        let directory = app
            .path()
            .app_cache_dir()
            .map_err(|_| "The private browser profile could not be prepared.")?
            .join("registration");
        std::fs::create_dir_all(&directory)
            .map_err(|_| "The private browser profile could not be prepared.")?;
        let navigation_state = state.clone();
        let navigation_app = app.clone();
        let popup_app = app.clone();
        let builder=WebviewBuilder::new("registration",WebviewUrl::External(URL.parse().map_err(|_|"Invalid registration URL.")?))
            .data_directory(directory).incognito(true).general_autofill_enabled(false).devtools(false)
            .initialization_script(SCRIPT)
            .on_navigation(move|url|{
                if let Some(secure)=upgrade_registration_url(url){
                    // Deny the legacy HTTP redirect before following it, then
                    // reuse the private view for the exact HTTPS destination.
                    let app=navigation_app.clone();
                    tauri::async_runtime::spawn(async move{
                        if let Some(view)=app.get_webview("registration"){
                            if view.navigate(secure).is_err(){if let Ok(mut s)=app.state::<DesktopState>().registration.lock(){s.status.loading=false;s.status.error="The secure UTAR page could not be loaded. Choose Reload.".into();}}
                        }
                    });
                    return false;
                }
                let allowed=is_registration_url(url);
                if let Ok(mut s)=navigation_state.lock(){if allowed{s.navigate(url.as_str().into());}else{s.generation+=1;s.status.loading=false;s.blocked_error="This page tried to leave the UTAR registration website. Use Reload to return.".into();}}
                allowed
            })
            .on_new_window(move|url,_|{let secure=if is_registration_url(&url){Some(url)}else{upgrade_registration_url(&url)};if let Some(url)=secure{let app=popup_app.clone();tauri::async_runtime::spawn(async move{if let Some(view)=app.get_webview("registration"){let _=view.navigate(url);}});}NewWindowResponse::Deny})
            .on_download(|_,_|false).on_permission_request(|_,_|PermissionResponse::Deny);
        let view = window
            .add_child(
                builder,
                LogicalPosition::new(0., 48.),
                LogicalSize::new(1., 1.),
            )
            .map_err(|_| "The registration view could not be created.")?;
        view.hide()
            .map_err(|_| "The registration view could not be hidden.")?;
        crate::native_webview::install(&view, state.clone())?;
        Ok(())
    })();
    if let Ok(mut s) = state.lock() {
        s.creating = false;
        if let Err(error) = &result {
            s.status.loading = false;
            s.status.error = error.clone();
        }
    }
    result
}

pub fn bounds(app: &AppHandle, bounds: Option<Bounds>, sequence: u64) -> Result<(), String> {
    let state = app.state::<DesktopState>();
    let healthy = {
        let mut s = state
            .registration
            .lock()
            .map_err(|_| "Registration state is unavailable.")?;
        if sequence <= s.bounds_sequence {
            return Ok(());
        }
        s.bounds_sequence = sequence;
        s.private
            && s.status.error.is_empty()
            && s.fatal_error.is_empty()
            && s.blocked_error.is_empty()
    };
    let Some(view) = app.get_webview("registration") else {
        return Ok(());
    };
    let window = view.window();
    let size = window
        .inner_size()
        .map_err(|_| "Window bounds are unavailable.")?
        .to_logical::<f64>(
            window
                .scale_factor()
                .map_err(|_| "Window scale is unavailable.")?,
        );
    if let Some(b) = bounds
        .and_then(|b| validate_bounds(b, size.width, size.height))
        .filter(|_| healthy)
    {
        view.set_bounds(tauri::Rect {
            position: LogicalPosition::new(b.x, b.y).into(),
            size: LogicalSize::new(b.width, b.height).into(),
        })
        .map_err(|_| "The registration bounds could not be set.")?;
        view.show()
            .map_err(|_| "The registration view could not be shown.")?;
    } else {
        view.hide()
            .map_err(|_| "The registration view could not be hidden.")?;
    }
    Ok(())
}

async fn evaluate(view: &Webview, script: &str) -> Result<String, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();
    let sender = Mutex::new(Some(tx));
    view.eval_with_callback(script, move |value| {
        if let Ok(mut sender) = sender.lock() {
            if let Some(tx) = sender.take() {
                let _ = tx.send(value);
            }
        }
    })
    .map_err(|_| "The UTAR page could not be read.")?;
    tokio::time::timeout(std::time::Duration::from_secs(5), rx)
        .await
        .map_err(|_| "Reading the UTAR page timed out. Choose Reload or import saved HTML.")?
        .map_err(|_| "The UTAR page changed before it could be read.".into())
}

pub async fn status(app: &AppHandle) -> Result<Status, String> {
    let state = app.state::<DesktopState>().registration.clone();
    let probe = {
        let mut s = state
            .lock()
            .map_err(|_| "Registration state is unavailable.")?;
        if !s.fatal_error.is_empty() {
            let mut status = s.status.clone();
            status.loading = false;
            status.error = s.fatal_error.clone();
            return Ok(status);
        }
        if !s.blocked_error.is_empty() {
            let mut status = s.status.clone();
            status.loading = false;
            status.error = s.blocked_error.clone();
            return Ok(status);
        }
        let login = s.url.contains("/portal/courseRegStu/login.jsp")
            || s.url.contains("/portal/courseRegStu/loginProSurvey.jsp");
        if !s.polling && !s.status.loading && s.status.error.is_empty() && login {
            s.polling = true;
            Some(s.generation)
        } else {
            None
        }
    };
    if let Some(generation) = probe {
        let value = if let Some(view) = app.get_webview("registration") {
            evaluate(
                &view,
                "window.__ttapRegistration ? window.__ttapRegistration.status() : {loginError:''}",
            )
            .await
            .ok()
        } else {
            None
        };
        if let Ok(mut s) = state.lock() {
            s.polling = false;
            if generation == s.generation {
                if let Some(value) =
                    value.and_then(|v| serde_json::from_str::<serde_json::Value>(&v).ok())
                {
                    s.status.login_error = value
                        .get("loginError")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .chars()
                        .take(500)
                        .collect();
                }
            }
        }
    }
    let status = state
        .lock()
        .map_err(|_| "Registration state is unavailable.")?
        .status
        .clone();
    Ok(status)
}

pub async fn reload(app: &AppHandle) -> Result<(), String> {
    open(app).await?;
    if let Ok(mut s) = app.state::<DesktopState>().registration.lock() {
        s.navigate(URL.into());
    }
    app.get_webview("registration")
        .ok_or("The registration view is unavailable.")?
        .navigate(URL.parse().map_err(|_| "Invalid registration URL.")?)
        .map_err(|_| "UTAR could not be reloaded.".into())
}

#[derive(Deserialize)]
struct TableResult {
    kind: String,
    text: Option<String>,
}
pub async fn read_page(app: &AppHandle) -> Result<HtmlSource, String> {
    let view = app
        .get_webview("registration")
        .ok_or("Open the registration page first.")?;
    let url = view
        .url()
        .map_err(|_| "The UTAR page URL could not be read.")?;
    if !is_schedule_url(&url) {
        return Err(
            "Open Course Timetable Preview in UTAR before importing. Login pages are not imported."
                .into(),
        );
    }
    let state = app.state::<DesktopState>().registration.clone();
    let generation = {
        let s = state
            .lock()
            .map_err(|_| "Registration state is unavailable.")?;
        if s.status.loading || !s.status.error.is_empty() {
            return Err(
                "Wait for the UTAR timetable page to finish loading, or choose Reload.".into(),
            );
        }
        s.generation
    };
    let result = evaluate(
        &view,
        "window.__ttapRegistration ? window.__ttapRegistration.read() : {kind:'missing'}",
    )
    .await?;
    let current = view.url().map_err(|_| "The UTAR page changed.")?;
    if current != url
        || !state
            .lock()
            .map_err(|_| "Registration state is unavailable.")?
            .accepts_read(generation, url.as_str())
    {
        return Err("The page changed. Open the timetable preview and try again.".into());
    }
    // JSON escaping may expand bounded UTF-8 text by up to six times.
    if result.len() > 6 * MAX_BYTES + 1024 {
        return Err("The course page exceeds the 10 MiB import limit.".into());
    }
    let result: TableResult = serde_json::from_str(&result)
        .map_err(|_| "The timetable page could not be read. Try Reload, or import saved HTML.")?;
    if result.kind == "too-large" {
        return Err("The course page exceeds the 10 MiB import limit.".into());
    }
    if result.kind != "table" {
        return Err("UTAR is showing a login form or no course table. Sign in and open Course Timetable Preview.".into());
    }
    let text = result
        .text
        .ok_or("The timetable page has no course table.")?;
    if text.len() > MAX_BYTES {
        return Err("The course page exceeds the 10 MiB import limit.".into());
    }
    Ok(HtmlSource {
        name: "UTAR course schedule".into(),
        text,
    })
}
