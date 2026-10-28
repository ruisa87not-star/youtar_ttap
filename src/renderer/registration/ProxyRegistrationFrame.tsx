import {useCallback,useEffect,useRef,useState} from 'react';
import {PROXY_CHANNEL,PROXY_LOGIN_PATH,type RegistrationProxyConfig,type ProxyFrameStatus} from '../../shared/registrationProxy';
import type {HtmlSource} from '../../shared/model';
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const id=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9-]{16,80}$/.test(value);
function frameStatus(value:unknown):value is ProxyFrameStatus{return record(value)&&['login','schedule','other','expired','error'].includes(String(value.kind))&&typeof value.loginError==='string'&&value.loginError.length<=300&&typeof value.error==='string'&&value.error.length<=300;}

export function ProxyRegistrationFrame({config,suspended,onSource}:{config:RegistrationProxyConfig;suspended:boolean;onSource:(source:HtmlSource)=>void}){
  const frame=useRef<HTMLIFrameElement>(null),channel=useRef(crypto.randomUUID()),documentId=useRef('');
  const pending=useRef<{id:string;timer:ReturnType<typeof setTimeout>}|null>(null),loadTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const[reload,setReload]=useState(0),[busy,setBusy]=useState(false),[compact,setCompact]=useState(true),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const[status,setStatus]=useState<ProxyFrameStatus>({kind:'login',loginError:'',error:''});const valid=config.plannerOrigin===location.origin;
  const cancel=useCallback(()=>{if(pending.current)clearTimeout(pending.current.timer);pending.current=null;setBusy(false);},[]);
  const waitForPage=useCallback(()=>{clearTimeout(loadTimer.current);loadTimer.current=setTimeout(()=>{setLoading(false);setError('The registration proxy did not respond. Choose Reload or import saved HTML.');},15000);},[]);
  const invalidate=useCallback(()=>{cancel();documentId.current='';channel.current=crypto.randomUUID();setLoading(true);waitForPage();},[cancel,waitForPage]);
  const send=useCallback((data:Record<string,unknown>)=>{frame.current?.contentWindow?.postMessage({channel:PROXY_CHANNEL,channelId:channel.current,...data},config.origin);},[config.origin]);
  const handshake=useCallback(()=>{if(suspended||!valid)return;invalidate();setError('');send({type:'hello'});},[suspended,valid,invalidate,send]);
  useEffect(()=>{
    if(!valid||suspended)return;
    function message(event:MessageEvent<unknown>){
      if(event.origin!==config.origin||event.source!==frame.current?.contentWindow||!record(event.data))return;const data=event.data;
      if(data.channel!==PROXY_CHANNEL||data.channelId!==channel.current||!id(data.documentId))return;
      if(data.type==='ready'){
        if(!frameStatus(data.status))return;clearTimeout(loadTimer.current);documentId.current=data.documentId;setStatus(data.status);setLoading(false);setError('');setCompact(data.status.kind==='login');return;
      }
      if(data.documentId!==documentId.current)return;
      if(data.type==='navigating'||data.type==='logged-out'){invalidate();return;}
      if(data.type==='status'&&frameStatus(data.status)){if(data.status.error)cancel();setStatus(data.status);setLoading(false);return;}
      if(data.type!=='preview'||!pending.current||data.requestId!==pending.current.id)return;
      if(typeof data.error==='string'&&data.error.length<=300){cancel();setError(data.error);return;}
      const source=data.source;if(!record(source)||source.name!=='UTAR course schedule'||typeof source.text!=='string'||new TextEncoder().encode(source.text).byteLength>10*1024*1024)return;
      cancel();onSource({name:'UTAR course schedule',text:source.text});
    }
    let active=true;window.addEventListener('message',message);queueMicrotask(()=>{if(active)handshake();});return ()=>{active=false;window.removeEventListener('message',message);clearTimeout(loadTimer.current);if(pending.current)clearTimeout(pending.current.timer);pending.current=null;documentId.current='';channel.current=crypto.randomUUID();};
  },[config.origin,config.plannerOrigin,suspended,onSource,valid,handshake,invalidate,cancel]);
  function request(type:'preview'|'logout'){
    if(!documentId.current||busy||suspended)return;const requestId=crypto.randomUUID();setError('');setBusy(true);
    pending.current={id:requestId,timer:setTimeout(()=>{pending.current=null;setBusy(false);setError(type==='preview'?'The course preview timed out. Try again.':'The proxy session could not be closed. Choose Reload.');},10000)};
    send({type,documentId:documentId.current,requestId});
  }
  if(!valid)return <p className="error" role="alert">Registration proxy configuration does not match this planner address.</p>;
  return <section className="registration-screen" aria-label="Integrated course registration" hidden={suspended}>
    <div className="registration-toolbar"><div><h2>Course Registration System</h2><p>Sign in below, then open Course Timetable Preview.</p></div><div className="actions">
      <button aria-pressed={!compact} disabled={loading} onClick={()=>{const next=!compact;setCompact(next);send({type:'layout',compact:next,documentId:documentId.current,requestId:crypto.randomUUID()});}}>{compact?'Show full page':'Compact login'}</button>
      <button onClick={()=>{invalidate();setError('');setCompact(true);setStatus({kind:'login',loginError:'',error:''});setReload(value=>value+1);}}>Reload</button>
      <button disabled={loading||busy} title="End this proxy session. UTAR's own session expires separately." onClick={()=>request('logout')}>Log out</button>
      <button className="primary" disabled={loading||busy||status.kind!=='schedule'} onClick={()=>request('preview')}>{busy?'Reading page…':'Preview courses from this page'}</button>
    </div></div>
    {(error||status.error||status.loginError)&&<p className="error" role="alert">{error||status.error||status.loginError}</p>}
    <p className="registration-status" role="status">Self-hosted UTAR proxy · {loading?'Loading…':status.kind==='schedule'?'Choose Preview to import your courses.':'Your login stays in this isolated view.'}</p>
    <div className="registration-proxy-viewport" hidden={suspended}><iframe key={reload} ref={frame} className="registration-frame" title="UTAR Course Registration System" src={config.origin+PROXY_LOGIN_PATH} sandbox="allow-scripts allow-forms allow-same-origin" referrerPolicy="no-referrer" onLoad={handshake} style={{width:'100%',height:'100%',minHeight:compact?220:0}}/></div>
  </section>;
}
