import {loginCSS} from '../shared/registrationScripts';
import {session,WebContentsView,type BrowserWindow} from 'electron';
import type {FileOutcome,HtmlSource} from '../shared/model';
import {UTAR_REGISTRATION_URL,type RegistrationBounds,type RegistrationStatus} from '../shared/registration';
import {readLoginError} from '../shared/loginError';

export interface RegistrationPort{
  open():void;
  setBounds(bounds:unknown):void;
  status():RegistrationStatus;
  reload():void;
  readPage():Promise<FileOutcome<HtmlSource>>;
}

export function isRegistrationURL(value:string):boolean{
  try{const url=new URL(value);return url.origin==='https://unitreg.utar.edu.my'&&!url.username&&!url.password;}catch{return false;}
}
export function isScheduleURL(value:string):boolean{
  return isRegistrationURL(value)&&['/portal/courseRegStu/schedule/masterSchedule.jsp','/portal/courseRegStu/schedule/masterScheduleSurvey.jsp'].includes(new URL(value).pathname);
}
function upgradeRegistrationURL(value:string):string|undefined{
  try{
    const url=new URL(value);
    if(url.origin!=='http://unitreg.utar.edu.my'||url.username||url.password)return;
    url.protocol='https:';
    return url.href;
  }catch{return;}
}

// Presentation only: keep UTAR's real form, scripts, CAPTCHA and submission intact.


export function createRegistrationView(window:BrowserWindow):RegistrationPort{
  let view:WebContentsView|undefined;let loading=false;let error='';let loginError='';let generation=0;let reading=false;
  function probeLogin(){
    if(!view||view.webContents.isDestroyed()||reading||loading||error)return;
    const wc=view.webContents,url=wc.getURL();if(!isRegistrationURL(url)||!/^\/portal\/courseRegStu\/(?:login|loginProSurvey)\.jsp$/.test(new URL(url).pathname))return;
    const id=generation;reading=true;
    void wc.executeJavaScript(`(${readLoginError.toString()})(document)`).then((value:unknown)=>{if(id===generation&&!wc.isDestroyed()&&wc.getURL()===url)loginError=typeof value==='string'?value.slice(0,500):'';}).catch(()=>{/* The original form and UTAR dialogs remain available. */}).finally(()=>{reading=false;});
  }
  function load(url=UTAR_REGISTRATION_URL){
    if(!view||view.webContents.isDestroyed())return;
    const id=++generation;loading=true;error='';loginError='';
    void view.webContents.loadURL(url).catch(()=>{if(id===generation){loading=false;if(!error)error='UTAR could not be loaded. Check your connection and choose Reload.';}});
  }
  function open(){
    if(view&&!view.webContents.isDestroyed())return;
    const isolated=session.fromPartition('ttap-registration',{cache:false});
    isolated.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
    isolated.setPermissionCheckHandler(()=>false);
    isolated.on('will-download',event=>event.preventDefault());
    view=new WebContentsView({webPreferences:{session:isolated,sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,allowRunningInsecureContent:false,webviewTag:false}});
    view.setBackgroundColor('#ffffff');view.setVisible(false);window.contentView.addChildView(view);
    const wc=view.webContents;
    const guard=(event:Electron.Event,url:string)=>{
      if(isRegistrationURL(url))return;
      event.preventDefault();
      // UTAR's successful login currently sends a same-host HTTP 302. Cancel
      // that request before following it; keep its private token only in memory.
      const secure=upgradeRegistrationURL(url);
      if(secure){load(secure);return;}
      error='This page tried to leave the UTAR registration website. Use Reload to return.';view?.setVisible(false);
    };
    wc.on('will-navigate',guard);wc.on('will-redirect',guard);
    wc.setWindowOpenHandler(({url})=>{const secure=isRegistrationURL(url)?url:upgradeRegistrationURL(url);if(secure)load(secure);return {action:'deny'};});
    wc.on('did-start-loading',()=>{++generation;loading=true;error='';loginError='';});
    wc.on('did-stop-loading',()=>{loading=false;});
    wc.on('did-navigate',(_event,_url,code,text)=>{if(code>=400){error=`UTAR returned HTTP ${code}${text?' '+String(text).slice(0,100):''}. Choose Reload to try again.`;view?.setVisible(false);}});
    wc.on('did-finish-load',()=>{loading=false;probeLogin();});
    wc.on('dom-ready',()=>{
      if(isRegistrationURL(wc.getURL())&&new URL(wc.getURL()).pathname==='/portal/courseRegStu/login.jsp'){
        void wc.insertCSS(loginCSS).catch(()=>{ /* The original page remains usable if its presentation changes. */ });
      }
    });
    wc.on('did-fail-load',(_event,code,description,_url,isMainFrame)=>{if(isMainFrame&&code!==-3){loading=false;error=`UTAR could not be loaded (${String(description).slice(0,120)}, ${code}). Check your connection and choose Reload.`;view?.setVisible(false);}});
    wc.on('will-attach-webview',event=>event.preventDefault());
    load();
  }
  function setBounds(value:unknown){
    if(!view||view.webContents.isDestroyed())return;
    if(!value||typeof value!=='object'){view.setVisible(false);return;}
    const {x,y,width,height}=value as RegistrationBounds;
    const [contentWidth,contentHeight]=window.getContentSize();
    if(![x,y,width,height].every(Number.isFinite)||x<0||y<48||width<1||height<1||x+width>contentWidth+1||y+height>contentHeight+1){view.setVisible(false);return;}
    view.setBounds({x:Math.ceil(x),y:Math.ceil(y),width:Math.max(1,Math.floor(Math.min(width,contentWidth-Math.ceil(x)))),height:Math.max(1,Math.floor(Math.min(height,contentHeight-Math.ceil(y))))});
    view.setVisible(!error);
  }
  window.on('resize',()=>view?.setVisible(false));
  window.on('closed',()=>{++generation;if(view&&!view.webContents.isDestroyed())view.webContents.close();view=undefined;});
  async function readPage():Promise<FileOutcome<HtmlSource>>{
    if(!view||view.webContents.isDestroyed())return {status:'error',message:'Open the registration page first.'};
    const wc=view.webContents;const url=wc.getURL();
    if(!isScheduleURL(url))return {status:'error',message:'Open Course Timetable Preview in UTAR before importing. Login pages are not imported.'};
    try{
      const text:unknown=await wc.executeJavaScript(`(()=>{
        if(document.querySelector('input[type="password"]'))return null;
        const table=document.querySelector('#overviewSector table');
        return table?'<div id="overviewSector">'+table.outerHTML+'</div>':null;
      })()`);
      if(wc.isDestroyed()||wc.getURL()!==url)return {status:'error',message:'The page changed. Open the timetable preview and try again.'};
      if(text===null)return {status:'error',message:'UTAR is showing a login form or no course table. Sign in and open Course Timetable Preview.'};
      if(typeof text!=='string'||Buffer.byteLength(text,'utf8')>10*1024*1024)return {status:'error',message:'The course page exceeds the 10 MiB import limit.'};
      return {status:'ok',value:{name:'UTAR course schedule',text}};
    }catch{return {status:'error',message:'The timetable page could not be read. Try Reload, or import saved HTML.'};}
  }
  return {open,setBounds,status:()=>{probeLogin();return {loading,error,loginError};},reload:()=>{open();load();},readPage};
}
