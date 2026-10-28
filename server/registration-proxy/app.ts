import {createServer,type IncomingMessage,type ServerResponse} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {isIP} from 'node:net';
import {CookieJar} from 'tough-cookie';
import {PROXY_LOGIN_PATH} from '../../src/shared/registrationProxy.ts';
import {ORIGIN,LOGIN,DOCUMENTS,requestTarget,upstreamURL} from './policy.ts';
import {SessionStore,cookieName,sessionIdFromCookie,assertPassid,bindPassid,rememberCookies,type Session} from './sessions.ts';
import {ServiceLimits} from './limits.ts';
import {rewriteHTML,rewriteCSS,rewriteRefresh} from './rewrite.ts';
import {httpsTransport,readBounded} from './transport.ts';
import {ProxyError,type ProxyConfig,type Transport} from './types.ts';

interface Options {config:ProxyConfig;transport?:Transport;bridgeSource:string;clock?:()=>number;upstreamTimeoutMs?:number;log?:(event:{event:string;code:string;status:number;duration:number})=>void;}
const formKeys=new Set(['preKap','reqFregkey','reqPassword','kaptchafield','_submit','_ttap_csrf']);
const equal=(a:string,b:string)=>/^[a-f0-9]{64}$/.test(a)&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
function text(bytes:Uint8Array,contentType:string):string{
  const declared=contentType.match(/charset\s*=\s*["']?([a-zA-Z0-9_-]+)/i)?.[1]??new TextDecoder('windows-1252').decode(bytes.slice(0,2048)).match(/charset\s*=\s*["']?([a-zA-Z0-9_-]+)/i)?.[1]??'utf-8';
  if(!['utf-8','utf8','iso-8859-1','windows-1252','us-ascii'].includes(declared.toLowerCase()))throw new ProxyError(502,'upstream_charset');
  return new TextDecoder(declared).decode(bytes);
}
async function formBody(req:IncomingMessage,signal:AbortSignal):Promise<URLSearchParams>{
  if(!/^application\/x-www-form-urlencoded(?:\s*;\s*charset=utf-8)?$/i.test(req.headers['content-type']??''))throw new ProxyError(415,'unsupported_body');
  if(Number(req.headers['content-length']??0)>16384){req.resume();throw new ProxyError(413,'request_size');}
  const bytes=await new Promise<Buffer>((resolve,reject)=>{
    const parts:Buffer[]=[];let size=0;
    const finish=(error?:ProxyError)=>{req.removeListener('data',data);req.removeListener('end',end);req.removeListener('error',failed);signal.removeEventListener('abort',aborted);if(error){req.resume();reject(error);}else resolve(Buffer.concat(parts));};
    const data=(part:Buffer)=>{size+=part.byteLength;if(size>16384)finish(new ProxyError(413,'request_size'));else parts.push(part);};
    const end=()=>finish(),failed=()=>finish(new ProxyError(400,'request_body')),aborted=()=>finish(new ProxyError(408,'request_timeout'));
    req.on('data',data);req.once('end',end);req.once('error',failed);signal.addEventListener('abort',aborted,{once:true});if(signal.aborted)aborted();
  });
  return new URLSearchParams(bytes.toString('utf8'));
}
function errorPage(config:ProxyConfig,session:Session|undefined,error:ProxyError){
  const empty:Session=session??{id:'',csrf:'',created:0,touched:0,jar:new CookieJar(),passids:new Set(),active:0,destroyed:false,controllers:new Set()};
  return rewriteHTML('<!doctype html><html><head><title>Registration unavailable</title></head><body><p>Registration is unavailable. Use Reload to retry.</p></body></html>',{upstream:new URL(ORIGIN+'/portal/courseRegStu/indexSurvey.jsp'),config,session:empty,errorKind:error.status===401?'expired':'error',errorCode:error.code});
}
export function createProxyServer(options:Options){
  const {config}=options,transport=options.transport??httpsTransport,clock=options.clock??Date.now,store=new SessionStore(clock),limits=new ServiceLimits(clock);
  // Insecure cookies are possible only in a trusted, explicitly injected loopback fixture.
  if(!config.secureCookies&&(!options.transport||![new URL(config.publicOrigin).hostname,new URL(config.plannerOrigin).hostname,config.host].every(value=>['127.0.0.1','[::1]','::1'].includes(value))))throw new ProxyError(500,'invalid_fixture');
  const timeout=Math.min(15000,Math.max(1,options.upstreamTimeoutMs??15000));
  function headers(res:ServerResponse){
    res.setHeader('cache-control','no-store');res.setHeader('x-content-type-options','nosniff');res.setHeader('referrer-policy','strict-origin');
    res.setHeader('content-security-policy',`default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self'; frame-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors ${config.plannerOrigin} ${config.publicOrigin}`);
    res.setHeader('permissions-policy','camera=(), microphone=(), geolocation=(), payment=()');if(config.secureCookies)res.setHeader('strict-transport-security','max-age=31536000');
  }
  const server=createServer({maxHeaderSize:8192},async(req,res)=>{
    const started=clock();let session:Session|undefined,release:(()=>void)|undefined,controller:AbortController|undefined,timer:ReturnType<typeof setTimeout>|undefined;
    headers(res);const disconnect=()=>{if(!res.writableEnded)controller?.abort();};res.once('close',disconnect);
    try{
      if(req.headers.host!==new URL(config.publicOrigin).host)throw new ProxyError(400,'invalid_host');
      const target=requestTarget(req.url??''),method=req.method;if(method!=='GET'&&method!=='POST')throw new ProxyError(405,'unsupported_method');
      if(target.pathname==='/__ttap/health'&&method==='GET'&&!target.search){res.writeHead(200,{'content-type':'text/plain; charset=utf-8'});res.end('ok');return;}
      if(target.pathname==='/__ttap/bridge.js'&&method==='GET'&&!target.search){res.writeHead(200,{'content-type':'text/javascript; charset=utf-8'});res.end(options.bridgeSource);return;}
      const logout=target.pathname==='/__ttap/logout'&&method==='POST'&&!target.search;
      const url=logout?target:upstreamURL(target,ORIGIN,method);
      const documentRequest=DOCUMENTS.has(url.pathname)||method==='POST';
      let ip=req.socket.remoteAddress??'';if(ip.startsWith('::ffff:'))ip=ip.slice(7);
      if(config.trustedProxyIP===ip){const value=req.headers['x-forwarded-for'];if(typeof value!=='string'||!isIP(value))throw new ProxyError(400,'invalid_forwarded_peer');ip=value;}
      session=store.get(sessionIdFromCookie(req.headers.cookie,config.secureCookies));
      if(!session&&url.pathname===PROXY_LOGIN_PATH&&method==='GET'){limits.creation(ip);session=store.create();res.setHeader('set-cookie',`${cookieName(config.secureCookies)}=${session.id}; Path=/; HttpOnly; SameSite=Strict${config.secureCookies?'; Secure':''}`);}
      if(!session)throw new ProxyError(401,'session_expired');assertPassid(session,url);
      release=limits.acquire(session);controller=new AbortController();session.controllers.add(controller);timer=setTimeout(()=>controller?.abort(),timeout);timer.unref();
      let body:Uint8Array|undefined;
      if(method==='POST'){
        if(req.headers.origin!==config.publicOrigin)throw new ProxyError(403,'invalid_origin');
        const fields=await formBody(req,controller.signal),csrf=fields.get('_ttap_csrf')??'';
        if(!equal(csrf,session.csrf)||[...fields.keys()].some(key=>!formKeys.has(key)||fields.getAll(key).length!==1))throw new ProxyError(403,'invalid_form');
        fields.delete('_ttap_csrf');
        if(logout){if([...fields].length)throw new ProxyError(403,'invalid_form');store.delete(session.id);res.setHeader('set-cookie',`${cookieName(config.secureCookies)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${config.secureCookies?'; Secure':''}`);res.writeHead(204);res.end();return;}
        if(['reqFregkey','reqPassword','kaptchafield'].some(key=>!fields.get(key)))throw new ProxyError(400,'missing_login_fields');
        limits.login(ip,session.id);body=new TextEncoder().encode(fields.toString());
      }
      if(documentRequest&&session.navigation){if(session.navigation.target===url.href){if(clock()-session.navigation.started>60000||session.navigation.hops>=8)throw new ProxyError(502,'redirect_limit');}else session.navigation=undefined;}
      const outgoing:Record<string,string>={accept:'text/html, text/css, image/*;q=0.8', 'user-agent':'youtar_ttap-registration-proxy/1',referer:LOGIN};
      const cookie=session.jar.getCookieStringSync(url.href);if(cookie)outgoing.cookie=cookie;if(body){outgoing.origin=ORIGIN;outgoing['content-type']='application/x-www-form-urlencoded';}
      const signal=controller.signal;
      const aborted=new Promise<never>((_resolve,reject)=>{signal.addEventListener('abort',()=>reject(new ProxyError(504,'upstream_timeout')),{once:true});if(signal.aborted)reject(new ProxyError(504,'upstream_timeout'));});
      const response=await Promise.race([transport({url,method,headers:outgoing,body},signal),aborted]);
      if(session.destroyed)throw new ProxyError(401,'session_expired');rememberCookies(session,response.headers,url);
      if([301,302,303,307,308].includes(response.status)){
        let dest:URL;try{dest=upstreamURL(response.headers.get('location')??'',url,(response.status===307||response.status===308)?method:'GET');}catch{throw new ProxyError(502,'upstream_redirect');}
        if(!response.headers.has('location'))throw new ProxyError(502,'upstream_redirect');
        const passid=dest.searchParams.get('passid');if(passid)bindPassid(session,passid);
        if(documentRequest){const previous=session.navigation;session.navigation={target:dest.href,hops:(previous?.hops??0)+1,started:previous?.started??clock()};}
        await response.body?.cancel();res.writeHead(response.status,{location:config.publicOrigin+dest.pathname+dest.search});res.end();return;
      }
      if(response.status<200||response.status>=300){await response.body?.cancel();throw new ProxyError(502,'upstream_status');}
      const contentType=response.headers.get('content-type')??'',kind=contentType.split(';')[0].trim().toLowerCase();
      if(!['text/html','text/css','image/jpeg','image/png','image/gif','image/x-icon'].includes(kind)){await response.body?.cancel();throw new ProxyError(502,'upstream_type');}
      if(DOCUMENTS.has(url.pathname)&&kind!=='text/html')throw new ProxyError(502,'upstream_type');
      const bytes=await Promise.race([readBounded(response.body,kind==='text/html'?10*1024*1024:2*1024*1024,signal),aborted]);
      if(session.destroyed)throw new ProxyError(401,'session_expired');
      let output:string|Uint8Array=bytes,refreshTarget:URL|undefined;if(kind==='text/html')output=rewriteHTML(text(bytes,contentType),{upstream:url,config,session,onRefresh:target=>{refreshTarget=target;}});if(kind==='text/css')output=rewriteCSS(text(bytes,contentType),url,config,session);
      const refresh=response.headers.get('refresh');if(refresh){const rewritten=rewriteRefresh(refresh,url,config,session);if(rewritten){res.setHeader('refresh',rewritten);const value=new URL(rewritten.slice(rewritten.indexOf('url=')+4));refreshTarget=new URL(value.pathname+value.search,ORIGIN);}}
      if(documentRequest)session.navigation=refreshTarget?{target:refreshTarget.href,hops:(session.navigation?.hops??0)+1,started:session.navigation?.started??clock()}:undefined;res.writeHead(200,{'content-type':kind+(kind.startsWith('text/')?'; charset=utf-8':'')});res.end(output);
    }catch(cause){
      const error=cause instanceof ProxyError?cause:new ProxyError(502,'upstream_failure');
      if(!res.destroyed&&!res.headersSent){res.writeHead(error.status,{'content-type':'text/html; charset=utf-8'});res.end(errorPage(config,session,error));}
      options.log?.({event:'request_rejected',code:error.code,status:error.status,duration:Math.max(0,clock()-started)});
    }finally{clearTimeout(timer);if(controller){controller.abort();session?.controllers.delete(controller);}release?.();res.removeListener('close',disconnect);}
  });
  server.headersTimeout=10000;server.requestTimeout=20000;server.keepAliveTimeout=5000;server.maxConnections=250;
  return {server,close:async()=>{store.close();limits.close();server.closeAllConnections();if(server.listening)await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
