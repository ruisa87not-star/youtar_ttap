use crate::DesktopState;
use tauri::{AppHandle, Emitter, EventTarget, Manager, Window, WindowEvent};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogResult};

pub fn install(window: &Window, app: AppHandle) {
    let close = app.state::<DesktopState>().close.clone();
    let target = window.clone();
    window.on_window_event(move|event|match event{
        WindowEvent::CloseRequested{api,..}=>{
            let request=match close.lock(){Ok(mut s)=>s.request_close(),Err(_)=>{api.prevent_close();return;}};
            if let Some(request)=request{
                api.prevent_close();let _=app.emit_to(EventTarget::Webview{label:"planner".into()},"ttap-close-requested",request);
                let app=app.clone();let window=target.clone();let state=close.clone();
                tauri::async_runtime::spawn(async move{
                    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                    let pending=if let Ok(mut s)=state.lock(){if s.needs_fallback(request){s.fallback_pending=true;true}else{false}}else{false};
                    if !pending{return;}
                    let dialog_app=app.clone();let parent=window.clone();
                    let response=tauri::async_runtime::spawn_blocking(move||dialog_app.dialog().message("The planner is not responding. Keep it open, or discard your unsaved timetable and close?").title("Keep your changes?").parent(&parent).buttons(MessageDialogButtons::OkCancelCustom("Discard and close".into(),"Keep open".into())).blocking_show_with_result()).await;
                    if let Ok(mut s)=state.lock(){s.fallback_pending=false;if s.request==request&&matches!(response,Ok(MessageDialogResult::Custom(ref label)) if label=="Discard and close"){s.allowed=true;drop(s);let _=window.close();}}
                });
            }
        }
        WindowEvent::Resized(_)|WindowEvent::ScaleFactorChanged{..}=>{if let Some(view)=app.get_webview("registration"){let _=view.hide();}}
        _=>{}
    });
}
