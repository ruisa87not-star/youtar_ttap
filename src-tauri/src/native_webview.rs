use crate::state::RegistrationState;
use std::sync::{Arc, Mutex};
use tauri::Webview;
use webview2_com::{
    Microsoft::Web::WebView2::Win32::{
        ICoreWebView2NavigationCompletedEventArgs2, ICoreWebView2_13, COREWEBVIEW2_WEB_ERROR_STATUS,
    },
    NavigationCompletedEventHandler, NavigationStartingEventHandler,
};
use windows::core::{Interface, BOOL};

pub fn install(view: &Webview, state: Arc<Mutex<RegistrationState>>) -> Result<(), String> {
    view.with_webview(move |platform|{
        // WebView2 COM interfaces are obtained and used only on their UI thread.
        let installed=(||->windows::core::Result<()>{unsafe{
            let core=platform.controller().CoreWebView2()?;
            let profile=core.cast::<ICoreWebView2_13>()?.Profile()?;
            let mut private=BOOL::default();profile.IsInPrivateModeEnabled(&mut private)?;
            if !private.as_bool(){if let Ok(mut s)=state.lock(){s.fatal_error="The isolated UTAR view is unavailable. Update Microsoft Edge WebView2 and restart the application.".into();}return Ok(());}
            if let Ok(mut s)=state.lock(){s.private=true;}
            let starting_state=state.clone();
            let starting=NavigationStartingEventHandler::create(Box::new(move|_,args|{
                if let Some(args)=args{let mut id=0;args.NavigationId(&mut id)?;if let Ok(mut s)=starting_state.lock(){s.start_native(id);}}
                Ok(())
            }));
            let completed_state=state.clone();
            let completed=NavigationCompletedEventHandler::create(Box::new(move|_,args|{
                if let Some(args)=args{
                    let mut id=0;let mut success=BOOL::default();let mut error=COREWEBVIEW2_WEB_ERROR_STATUS(0);let mut http=0;
                    args.NavigationId(&mut id)?;args.IsSuccess(&mut success)?;args.WebErrorStatus(&mut error)?;
                    if let Ok(details)=args.cast::<ICoreWebView2NavigationCompletedEventArgs2>(){let _=details.HttpStatusCode(&mut http);}
                    if let Ok(mut s)=completed_state.lock(){s.complete(id,success.as_bool(),http,error.0);}
                }
                Ok(())
            }));
            let mut token=0;core.add_NavigationStarting(&starting,&mut token)?;core.add_NavigationCompleted(&completed,&mut token)?;
            Ok(())
        }})();
        if installed.is_err(){if let Ok(mut s)=state.lock(){s.private=false;s.fatal_error="The isolated UTAR view could not be initialized. Update Microsoft Edge WebView2 and restart the application.".into();}}
    }).map_err(|_|"The native registration view could not be configured.".into())
}
