mod close;
mod commands;
pub mod files;
mod native_webview;
pub mod policy;
mod registration;
pub mod state;
use std::sync::{atomic::AtomicBool, Arc, Mutex};
use tauri::{LogicalPosition, WebviewUrl};

#[derive(Default)]
pub struct DesktopState {
    pub registration: Arc<Mutex<state::RegistrationState>>,
    pub close: Arc<Mutex<state::CloseState>>,
    pub file_busy: Arc<AtomicBool>,
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(DesktopState::default())
        .invoke_handler(tauri::generate_handler![
            commands::ttap_pick_html,
            commands::ttap_open_project,
            commands::ttap_export_project,
            commands::ttap_export_image,
            commands::ttap_open_registration,
            commands::ttap_registration_bounds,
            commands::ttap_registration_status,
            commands::ttap_reload_registration,
            commands::ttap_read_registration,
            commands::ttap_set_dirty,
            commands::ttap_acknowledge_close,
            commands::ttap_confirm_close
        ])
        .setup(|app| {
            let window = tauri::window::WindowBuilder::new(app, "main")
                .title("youtar_ttap (Tauri) 0.5.1-beta.1")
                .inner_size(1280., 800.)
                .min_inner_size(640., 480.)
                .maximized(true)
                .visible(false)
                .build()?;
            let size = window
                .inner_size()?
                .to_logical::<f64>(window.scale_factor()?);
            let planner = tauri::webview::WebviewBuilder::new(
                "planner",
                WebviewUrl::App("index.html".into()),
            )
            .auto_resize()
            .disable_drag_drop_handler()
            .devtools(cfg!(debug_assertions))
            .on_navigation(|url| policy::is_trusted_caller("planner", url))
            .on_new_window(|_, _| tauri::webview::NewWindowResponse::Deny)
            .on_download(|_, _| false)
            .on_permission_request(|_, _| tauri::webview::PermissionResponse::Deny);
            window.add_child(planner, LogicalPosition::new(0., 0.), size)?;
            close::install(&window, app.handle().clone());
            window.show()?;
            window.maximize()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("The Tauri application could not start");
}
