// @vitest-environment node
import {afterEach,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createProxyServer} from '../../server/registration-proxy/app.ts';
import {LOGIN,LOGIN_POST,ORIGIN} from '../../server/registration-proxy/policy.ts';
import type {Transport,TransportRequest} from '../../server/registration-proxy/types.ts';
const cleanups:Array<()=>Promise<void>>=[];afterEach(async()=>{await Promise.all(cleanups.splice(0).map(close=>close()));});
const login='<form method="post" action="loginProSurvey.jsp"><input name="preKap" value="synthetic-opaque"><input name="reqFregkey"><input name="reqPassword" type="password"><input name="kaptchafield"><button>Login</button></form>';
const preview=readFileSync('tests/fixtures/student-lecturer.html','utf8');
async function setup(custom?:Transport,timeout=15000){
  const calls:TransportRequest[]=[],logs:unknown[]=[];let counter=0,now=Date.now();const config={publicOrigin:'http://127.0.0.1:0',plannerOrigin:'http://127.0.0.1:4199',host:'127.0.0.1',port:0,secureCookies:false};
  const transport:Transport=custom??(async request=>{calls.push(request);if(request.url.pathname.endsWith('/login.jsp'))return new Response(login,{headers:{'content-type':'text/html','set-cookie':`UPSTREAM=synthetic-${++counter}; Path=/; Secure; HttpOnly`}});if(request.method==='POST')return new Response(null,{status:302,headers:{location:'http://unitreg.utar.edu.my/portal/courseRegStu/indexSurvey.jsp?passid=synthetic-owned-token'}});return new Response(preview,{headers:{'content-type':'text/html'}});});
  const app=createProxyServer({config,transport,bridgeSource:'/* synthetic bridge */',clock:()=>now,upstreamTimeoutMs:timeout,log:event=>logs.push(event)});await new Promise<void>(resolve=>app.server.listen(0,'127.0.0.1',resolve));const address=app.server.address();if(!address||typeof address==='string')throw Error('fixture');config.publicOrigin=`http://127.0.0.1:${address.port}`;cleanups.push(app.close);
  const start=async()=>{const response=await fetch(config.publicOrigin+'/portal/courseRegStu/login.jsp');const html=await response.text(),cookie=response.headers.getSetCookie()[0]?.split(';')[0],csrf=html.match(/name="_ttap_csrf" value="([a-f0-9]+)"/)?.[1];expect(response.status).toBe(200);expect(cookie).toBeTruthy();expect(csrf).toBeTruthy();return {cookie,csrf:csrf!};};
  const post=(cookie:string,csrf:string,extra:Record<string,string>={})=>fetch(config.publicOrigin+LOGIN_POST,{method:'POST',redirect:'manual',headers:{cookie,origin:config.publicOrigin,'content-type':'application/x-www-form-urlencoded',...extra},body:new URLSearchParams({_ttap_csrf:csrf,preKap:'synthetic-opaque',reqFregkey:'synthetic-user',reqPassword:'synthetic-password',kaptchafield:'synthetic-code'})});
  return {app,config,calls,logs,start,post,setTime:(value:number)=>{now=value;},time:()=>now};
}
it('rewrites the real legacy redirect pattern without HTTP egress and forwards only the private jar/validated form',async()=>{
  const s=await setup(),a=await s.start();const result=await s.post(a.cookie,a.csrf);expect(result.status).toBe(302);expect(result.headers.get('location')).toBe(s.config.publicOrigin+'/portal/courseRegStu/indexSurvey.jsp?passid=synthetic-owned-token');
  const final=await fetch(result.headers.get('location')!,{headers:{cookie:a.cookie}});expect(final.status).toBe(200);expect(await final.text()).toContain('TEST2013');expect(final.headers.get('cache-control')).toBe('no-store');expect(final.headers.get('access-control-allow-origin')).toBeNull();
  expect(s.calls.every(call=>call.url.origin===ORIGIN)).toBe(true);expect(s.calls[1].headers.cookie).toContain('UPSTREAM=synthetic-');expect(s.calls[1].headers.origin).toBe(ORIGIN);const sent=new TextDecoder().decode(s.calls[1].body);expect(sent).toContain('preKap=synthetic-opaque');expect(sent).not.toContain('_ttap_csrf');expect(JSON.stringify(s.logs)).not.toMatch(/synthetic-password|synthetic-user|synthetic-owned-token|passid|UPSTREAM/);
});
it('denies unknown/cross-session passids and destroys authority on logout and expiry',async()=>{
  const s=await setup(),a=await s.start(),b=await s.start();await s.post(a.cookie,a.csrf);const path='/portal/courseRegStu/indexSurvey.jsp?passid=synthetic-owned-token',before=s.calls.length;
  expect((await fetch(s.config.publicOrigin+path,{headers:{cookie:b.cookie}})).status).toBe(403);expect(s.calls).toHaveLength(before);
  const logout=await fetch(s.config.publicOrigin+'/__ttap/logout',{method:'POST',headers:{cookie:a.cookie,origin:s.config.publicOrigin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({_ttap_csrf:a.csrf})});expect(logout.status).toBe(204);
  expect((await fetch(s.config.publicOrigin+path,{headers:{cookie:a.cookie}})).status).toBe(401);s.setTime(s.time()+15*60_000);expect((await fetch(s.config.publicOrigin+'/portal/Kaptcha.jpg',{headers:{cookie:b.cookie}})).status).toBe(401);
});
it('rejects cross-origin/CSRF, non-login mutation, forged tokens and oversized bodies before egress',async()=>{
  const s=await setup(),a=await s.start(),before=s.calls.length;
  expect((await s.post(a.cookie,'wrong')).status).toBe(403);expect((await s.post(a.cookie,a.csrf,{origin:'https://evil.example'})).status).toBe(403);
  expect((await fetch(s.config.publicOrigin+'/portal/courseRegStu/registration/submit.jsp',{method:'POST',headers:{cookie:a.cookie}})).status).toBe(403);
  expect((await fetch(s.config.publicOrigin+LOGIN_POST,{method:'POST',headers:{cookie:a.cookie,origin:s.config.publicOrigin,'content-type':'application/x-www-form-urlencoded'},body:'x='.repeat(9000)})).status).toBe(413);expect(s.calls).toHaveLength(before);
});
it('does not trust forged forwarding headers and never forwards unrelated visitor cookies',async()=>{
  const s=await setup(),a=await s.start();await s.post(a.cookie+'; MAIN_ACCOUNT=synthetic-main-account',a.csrf);expect(s.calls[1].headers.cookie).not.toContain('MAIN_ACCOUNT');
  for(let i=1;i<10;i++)expect((await fetch(s.config.publicOrigin+'/portal/courseRegStu/login.jsp',{headers:{'x-forwarded-for':'192.0.2.'+i}})).status).toBe(200);
  expect((await fetch(s.config.publicOrigin+'/portal/courseRegStu/login.jsp',{headers:{'x-forwarded-for':'192.0.2.200'}})).status).toBe(429);
});
it('blocks off-site redirects and method-preserving credential replay',async()=>{
  const custom:Transport=async request=>request.method==='GET'?new Response(login,{headers:{'content-type':'text/html'}}):new Response(null,{status:307,headers:{location:'https://evil.example/receive'}});
  const s=await setup(custom),a=await s.start();expect((await s.post(a.cookie,a.csrf)).status).toBe(502);
});
it('bounds stalled upstream work and does not expose exceptions or request values',async()=>{
  const custom:Transport=async request=>request.url.href===LOGIN?new Response(login,{headers:{'content-type':'text/html'}}):new Promise(()=>{});
  const s=await setup(custom,25),a=await s.start();const response=await s.post(a.cookie,a.csrf);expect(response.status).toBe(504);expect(await response.text()).not.toContain('synthetic-password');
});
it('rejects unsupported/oversized upstream data and looping redirects without leaking errors',async()=>{
  const s=await setup(async request=>request.url.href===LOGIN?new Response(login,{headers:{'content-type':'text/html'}}):new Response('x'.repeat(10*1024*1024+1),{headers:{'content-type':'text/html'}})),a=await s.start();expect((await s.post(a.cookie,a.csrf)).status).toBe(502);
  const loop=await setup(async request=>request.url.href===LOGIN?new Response(login,{headers:{'content-type':'text/html'}}):new Response(null,{status:302,headers:{location:'/portal/courseRegStu/indexSurvey.jsp?passid=synthetic-loop'}})),b=await loop.start();let response=await loop.post(b.cookie,b.csrf),hops=0;
  while(response.status===302&&hops++<10)response=await fetch(response.headers.get('location')!,{redirect:'manual',headers:{cookie:b.cookie}});expect(response.status).toBe(502);expect(hops).toBeLessThanOrEqual(8);
});
it('rejects duplicate or non-ASCII CSRF, duplicate fields, unsupported methods and unrelated paths',async()=>{
  const s=await setup(),a=await s.start(),before=s.calls.length;
  expect((await s.post(a.cookie,'密'.repeat(64))).status).toBe(403);
  const response=await fetch(s.config.publicOrigin+LOGIN_POST,{method:'POST',headers:{cookie:a.cookie,origin:s.config.publicOrigin,'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams([['_ttap_csrf',a.csrf],['_ttap_csrf',a.csrf]])});expect(response.status).toBe(403);
  expect((await fetch(s.config.publicOrigin+'/portal/courseRegStu/indexSurvey.jsp',{method:'DELETE'})).status).toBe(405);expect((await fetch(s.config.publicOrigin+'/random')).status).toBe(403);expect(s.calls).toHaveLength(before);
});
it.each(['meta','header'])('keeps the 8-hop %s refresh budget across interleaved and delayed assets',async kind=>{
  const path='/portal/courseRegStu/indexSurvey.jsp',asset='/portal/courseRegStu/skin/main.css';let release!:(value:Response)=>void,entered!:()=>void,first=true;const started=new Promise<void>(resolve=>{entered=resolve;});
  const s=await setup(async request=>{if(request.url.pathname.endsWith('/login.jsp'))return new Response(login,{headers:{'content-type':'text/html'}});if(request.url.pathname===asset){if(first){first=false;entered();return new Promise<Response>(resolve=>{release=resolve;});}return new Response('body{}',{headers:{'content-type':'text/css'}});}return new Response(kind==='meta'?`<meta http-equiv="refresh" content="0;url=${ORIGIN+path}"><link rel="stylesheet" href="${asset}">`:'<p>Refresh fixture</p>',{headers:{'content-type':'text/html',...(kind==='header'?{refresh:'0;url='+ORIGIN+path}:{})}});});
  const a=await s.start(),codes:number[]=[];let delayed:Promise<Response>|undefined;
  for(let i=0;i<9;i++){const result=await fetch(s.config.publicOrigin+path,{headers:{cookie:a.cookie}});codes.push(result.status);await result.text();if(i===0){delayed=fetch(s.config.publicOrigin+asset,{headers:{cookie:a.cookie}});await started;}else if(i===3){release(new Response('body{}',{headers:{'content-type':'text/css'}}));await (await delayed!).text();}const css=await fetch(s.config.publicOrigin+asset,{headers:{cookie:a.cookie}});expect(css.status).toBe(200);await css.text();}
  expect(codes).toEqual([200,200,200,200,200,200,200,200,502]);
});
it.each(['meta','header'])('keeps the 60-second %s refresh deadline while assets load',async kind=>{
  const path='/portal/courseRegStu/indexSurvey.jsp';const s=await setup(async request=>request.url.pathname.endsWith('/login.jsp')?new Response(login,{headers:{'content-type':'text/html'}}):request.url.pathname.endsWith('.css')?new Response('body{}',{headers:{'content-type':'text/css'}}):new Response(kind==='meta'?`<meta http-equiv="refresh" content="0;url=${ORIGIN+path}">`:'<p>Refresh fixture</p>',{headers:{'content-type':'text/html',...(kind==='header'?{refresh:'0;url='+ORIGIN+path}:{})}}));const a=await s.start(),codes:number[]=[];
  for(let i=0;i<7;i++){const result=await fetch(s.config.publicOrigin+path,{headers:{cookie:a.cookie}});codes.push(result.status);await result.text();await (await fetch(s.config.publicOrigin+'/portal/courseRegStu/skin/main.css',{headers:{cookie:a.cookie}})).text();s.setTime(s.time()+10001);}expect(codes).toEqual([200,200,200,200,200,200,502]);
});
