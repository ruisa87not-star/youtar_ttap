use crate::{files, policy, registration, state::Status, DesktopState};
use serde::Serialize;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::{AppHandle, Manager, Webview};
use tauri_plugin_dialog::DialogExt;

fn authorize(webview: &Webview) -> Result<(), String> {
    let url = webview.url().map_err(|_| "Untrusted native caller.")?;
    if !policy::is_trusted_caller(webview.label(), &url) {
        return Err("Untrusted native caller.".into());
    }
    Ok(())
}
#[derive(Serialize)]
#[serde(tag = "status", rename_all = "lowercase")]
pub enum Outcome<T> {
    Ok { value: T },
    Cancelled,
    Error { message: String },
}
fn outcome<T>(value: Result<Option<T>, String>) -> Outcome<T> {
    match value {
        Ok(Some(value)) => Outcome::Ok { value },
        Ok(None) => Outcome::Cancelled,
        Err(message) => Outcome::Error { message },
    }
}
struct DialogPermit(Arc<AtomicBool>);
impl DialogPermit {
    fn take(app: &AppHandle) -> Result<Self, String> {
        let busy = app.state::<DesktopState>().file_busy.clone();
        busy.compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map_err(|_| "Finish the current file dialog first.")?;
        Ok(Self(busy))
    }
}
impl Drop for DialogPermit {
    fn drop(&mut self) {
        self.0.store(false, Ordering::Release);
    }
}

#[tauri::command]
pub async fn ttap_pick_html(
    app: AppHandle,
    webview: Webview,
) -> Result<Outcome<Vec<files::HtmlSource>>, String> {
    authorize(&webview)?;
    let _permit = DialogPermit::take(&app)?;
    let parent = webview.window();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let Some(paths) = app
            .dialog()
            .file()
            .set_parent(&parent)
            .set_title("Import UTAR schedule")
            .add_filter("HTML pages", &["html", "htm"])
            .blocking_pick_files()
        else {
            return Ok(None);
        };
        let paths = paths
            .into_iter()
            .map(|v| v.into_path().map_err(|_| "Choose local files.".to_string()))
            .collect::<Result<Vec<_>, _>>()?;
        files::read_html_paths(&paths).map(Some)
    })
    .await
    .map_err(|_| "The native file operation failed.")?;
    Ok(outcome(result))
}
#[tauri::command]
pub async fn ttap_open_project(
    app: AppHandle,
    webview: Webview,
) -> Result<Outcome<serde_json::Value>, String> {
    authorize(&webview)?;
    let _permit = DialogPermit::take(&app)?;
    let parent = webview.window();
    let result=tauri::async_runtime::spawn_blocking(move||{
        let Some(path)=app.dialog().file().set_parent(&parent).set_title("Open timetable project").add_filter("Timetable project",&["json"]).blocking_pick_file()else{return Ok(None);};
        let path=path.into_path().map_err(|_|"Choose a local file.")?;let text=files::read_text(&path)?;
        Ok(Some(serde_json::json!({"name":path.file_name().unwrap_or_default().to_string_lossy(),"text":text})))
    }).await.map_err(|_|"The native file operation failed.")?;
    Ok(outcome(result))
}
async fn save(
    app: AppHandle,
    webview: Webview,
    bytes: Vec<u8>,
    project: bool,
) -> Result<Outcome<serde_json::Value>, String> {
    let _permit = DialogPermit::take(&app)?;
    let parent = webview.window();
    let result=tauri::async_runtime::spawn_blocking(move||{
        let dialog=app.dialog().file().set_parent(&parent);
        let selected=if project{dialog.set_title("Save timetable project").set_file_name("my-timetable.ttap.json").add_filter("Timetable project",&["json"]).blocking_save_file()}else{dialog.set_title("Save registration guide image").set_file_name("my-timetable.png").add_filter("PNG image",&["png"]).blocking_save_file()};
        let Some(path)=selected else{return Ok(None);};let path=path.into_path().map_err(|_|"Choose a local destination.")?;
        files::write_atomically(&path,&bytes)?;Ok(Some(serde_json::json!({"kind":"saved","name":path.file_name().unwrap_or_default().to_string_lossy()})))
    }).await.map_err(|_|"The native file operation failed.")?;
    Ok(outcome(result))
}
#[tauri::command]
pub async fn ttap_export_image(
    app: AppHandle,
    webview: Webview,
    png: String,
) -> Result<Outcome<serde_json::Value>, String> {
    authorize(&webview)?;
    match files::decode_png(&png) {
        Ok(bytes) => save(app, webview, bytes, false).await,
        Err(message) => Ok(Outcome::Error { message }),
    }
}
#[tauri::command]
pub async fn ttap_export_project(
    app: AppHandle,
    webview: Webview,
    text: String,
) -> Result<Outcome<serde_json::Value>, String> {
    authorize(&webview)?;
    let valid = text.len() <= files::MAX_BYTES
        && serde_json::from_str::<serde_json::Value>(&text).is_ok_and(|v| {
            v.get("schemaVersion").and_then(|v| v.as_u64()) == Some(1)
                && v.get("courses").is_some_and(|v| v.is_array())
                && v.get("selection").is_some_and(|v| v.is_object())
        });
    if !valid {
        return Ok(Outcome::Error {
            message: "Choose a valid timetable project no larger than 10 MiB.".into(),
        });
    }
    save(app, webview, text.into_bytes(), true).await
}
#[tauri::command]
pub async fn ttap_open_registration(app: AppHandle, webview: Webview) -> Result<(), String> {
    authorize(&webview)?;
    registration::open(&app).await
}
#[tauri::command]
pub fn ttap_registration_bounds(
    app: AppHandle,
    webview: Webview,
    bounds: Option<policy::Bounds>,
    sequence: u64,
) -> Result<(), String> {
    authorize(&webview)?;
    registration::bounds(&app, bounds, sequence)
}
#[tauri::command]
pub async fn ttap_registration_status(app: AppHandle, webview: Webview) -> Result<Status, String> {
    authorize(&webview)?;
    registration::status(&app).await
}
#[tauri::command]
pub async fn ttap_reload_registration(app: AppHandle, webview: Webview) -> Result<(), String> {
    authorize(&webview)?;
    registration::reload(&app).await
}
#[tauri::command]
pub async fn ttap_read_registration(
    app: AppHandle,
    webview: Webview,
) -> Result<Outcome<files::HtmlSource>, String> {
    authorize(&webview)?;
    Ok(outcome(registration::read_page(&app).await.map(Some)))
}
#[tauri::command]
pub fn ttap_set_dirty(
    app: AppHandle,
    webview: Webview,
    dirty: bool,
    sequence: u64,
) -> Result<(), String> {
    authorize(&webview)?;
    app.state::<DesktopState>()
        .close
        .lock()
        .map_err(|_| "Close protection is unavailable.")?
        .set_dirty(dirty, sequence);
    Ok(())
}
#[tauri::command]
pub fn ttap_acknowledge_close(
    app: AppHandle,
    webview: Webview,
    request: u64,
) -> Result<(), String> {
    authorize(&webview)?;
    app.state::<DesktopState>()
        .close
        .lock()
        .map_err(|_| "Close protection is unavailable.")?
        .acknowledge(request);
    Ok(())
}
#[tauri::command]
pub fn ttap_confirm_close(app: AppHandle, webview: Webview) -> Result<(), String> {
    authorize(&webview)?;
    app.state::<DesktopState>()
        .close
        .lock()
        .map_err(|_| "Close protection is unavailable.")?
        .allowed = true;
    webview
        .window()
        .close()
        .map_err(|_| "The planner window could not be closed.".into())
}
