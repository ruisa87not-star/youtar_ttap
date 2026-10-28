import {PROXY_CHANNEL,PROXY_LOGIN_PATH,PROXY_SCHEDULE_PATHS,type ProxyFrameStatus} from '../../shared/registrationProxy.ts';
import {sanitizeCourseTable} from '../../shared/proxyTable.ts';
import {readLoginError} from '../../shared/loginError.ts';
const script=document.currentScript;
if(script instanceof HTMLScriptElement&&script.dataset.parentOrigin&&script.dataset.documentId){
  const parentOrigin=script.dataset.parentOrigin,documentId=script.dataset.documentId,csrf=script.dataset.csrf??'',forcedKind=script.dataset.errorKind;let channelId='',navigating=false;let secrets:string[]=[];
  try{const values:unknown=JSON.parse(script.dataset.passids??'[]');if(Array.isArray(values))secrets=values.filter((value):value is string=>typeof value==='string'&&value.length<=512).slice(0,16);}catch{/* The server-generated config is bounded; no page data is logged. */}
  const send=(value:Record<string,unknown>)=>{if(channelId)parent.postMessage({channel:PROXY_CHANNEL,channelId,documentId,...value},parentOrigin);};
  const status=():ProxyFrameStatus=>{
    const kind=forcedKind==='expired'?'expired':forcedKind==='error'?'error':location.pathname===PROXY_LOGIN_PATH||location.pathname.endsWith('/loginProSurvey.jsp')?'login':PROXY_SCHEDULE_PATHS.some(path=>path===location.pathname)?'schedule':'other';
    const message=kind==='login'?readLoginError(document):'';
    const loginError=!message?'':/captcha|verification|code/i.test(message)?'UTAR did not accept the verification code. Check the form below.':/password|credential|student|login/i.test(message)?'UTAR did not accept the login details. Check the form below.':'UTAR reported a login error. Check the form below.';
    return {kind,loginError,error:kind==='expired'?'Your UTAR proxy session expired. Choose Reload.':kind==='error'?'The UTAR proxy could not load this page. Choose Reload.':''};
  };
  const leave=()=>{navigating=true;send({type:'navigating'});};
  addEventListener('beforeunload',leave);addEventListener('pagehide',leave);
  document.addEventListener('submit',event=>setTimeout(()=>{if(!event.defaultPrevented)leave();},0),true);
  document.addEventListener('click',event=>{const target=event.target,link=target instanceof Element?target.closest('a[href]'):null;if(!(link instanceof HTMLAnchorElement))return;const url=new URL(link.href,location.href);setTimeout(()=>{if(!event.defaultPrevented&&(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search))leave();},0);},true);
  addEventListener('message',event=>{
    if(event.origin!==parentOrigin||event.source!==parent||!event.data||typeof event.data!=='object')return;const data=event.data as Record<string,unknown>;
    if(data.channel!==PROXY_CHANNEL||typeof data.channelId!=='string'||!/^[a-f0-9-]{16,80}$/.test(data.channelId))return;
    if(data.type==='hello'){channelId=data.channelId;send({type:'ready',status:status()});return;}
    if(data.channelId!==channelId||data.documentId!==documentId||typeof data.requestId!=='string'||!/^[a-f0-9-]{16,80}$/.test(data.requestId))return;
    if(data.type==='layout'&&typeof data.compact==='boolean'){const style=document.getElementById('ttap-proxy-login-style');if(style instanceof HTMLStyleElement)style.media=data.compact?'all':'not all';return;}
    if(data.type==='preview'){
      if(navigating){send({type:'preview',requestId:data.requestId,error:'The page changed. Try Preview again.'});return;}
      if(!PROXY_SCHEDULE_PATHS.some(path=>path===location.pathname)){send({type:'preview',requestId:data.requestId,error:'Open Course Timetable Preview before importing.'});return;}
      const result=sanitizeCourseTable(document,secrets);send({type:'preview',requestId:data.requestId,...(result.kind==='table'?{source:{name:'UTAR course schedule',text:result.text}}:{error:result.kind==='unsafe'?'The course table could not be shared safely. Use saved HTML import.':result.kind==='too-large'?'The course page exceeds the import limit.':'UTAR is showing a login form or no course table.'})});
    }
    if(data.type==='logout'){
      navigating=true;void fetch('/__ttap/logout',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_ttap_csrf:csrf})}).then(response=>{if(!response.ok)throw Error('logout_rejected');send({type:'logged-out'});location.replace(PROXY_LOGIN_PATH);}).catch(()=>{navigating=false;send({type:'status',status:{kind:'error',loginError:'',error:'The proxy session could not be closed. Choose Reload.'}});});
    }
  });
}
