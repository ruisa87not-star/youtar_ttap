// Loopback-only synthetic harness, never imported by the production entry.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {randomBytes} from 'node:crypto';
import {build} from 'vite';
import react from '@vitejs/plugin-react';
import {createProxyServer} from '../server/registration-proxy/app.ts';
import {LOGIN,ORIGIN} from '../server/registration-proxy/policy.ts';
import type {Transport} from '../server/registration-proxy/types.ts';
const plannerOrigin='http://127.0.0.1:4177',publicOrigin='http://127.0.0.1:4187',root=resolve('.cache/proxy-browser/dist');let now=Date.now();
const preview=await readFile('tests/fixtures/student-lecturer.html','utf8');
const login=(error=false)=>`<!doctype html><html><head><meta charset="utf-8"><title>Synthetic login</title></head><body><div id="body_col"><h2>Course Registration System</h2><form method="post" action="loginProSurvey.jsp" onsubmit="if(!this.reqFregkey.value){event.preventDefault();return false;}"><input type="hidden" name="preKap" value="synthetic-opaque"><table><tr><td><label>Student ID <input name="reqFregkey"></label></td></tr><tr><td><label>Password <input type="password" name="reqPassword"></label></td></tr><tr><td><label>Verification code <input name="kaptchafield"></label><img alt="Synthetic CAPTCHA" src="/portal/Kaptcha.jpg"></td></tr><tr><td><button>Login</button></td></tr></table></form>${error?'<p role="alert">Invalid verification code. Please try again.</p>':''}</div></body></html>`;
const transport:Transport=async request=>{
  if(request.url.origin!==ORIGIN)throw Error('synthetic_https_violation');
  const pathname=request.url.pathname,token=request.url.searchParams.get('passid')??'';
  if(pathname.endsWith('/login.jsp'))return new Response(login(request.url.searchParams.has('message')).replace('<body>','<body><table id="fixture-banner"><tr><td>Synthetic banner</td></tr></table>'),{headers:{'content-type':'text/html','set-cookie':'UPSTREAM=synthetic-jar-'+randomBytes(12).toString('hex')+'; Secure; HttpOnly; Path=/'}});
  if(pathname==='/portal/Kaptcha.jpg')return new Response(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aGxsAAAAASUVORK5CYII=','base64'),{headers:{'content-type':'image/png'}});
  if(request.method==='POST'){
    const fields=new URLSearchParams(new TextDecoder().decode(request.body));if(fields.get('preKap')!=='synthetic-opaque'||!request.headers.cookie?.includes('UPSTREAM=synthetic-jar-'))throw Error('synthetic_form_contract');
    if(fields.get('kaptchafield')!=='synthetic-code'||fields.get('reqFregkey')!=='synthetic-user'||fields.get('reqPassword')!=='synthetic-password')return new Response(null,{status:302,headers:{location:LOGIN+'?message=error'}});
    return new Response(null,{status:302,headers:{location:'http://unitreg.utar.edu.my/portal/courseRegStu/indexSurvey.jsp?passid=synthetic-owned-'+randomBytes(12).toString('hex')}});
  }
  const path='/portal/courseRegStu/schedule/masterScheduleSurvey.jsp?passid='+encodeURIComponent(token);
  if(pathname.endsWith('/indexSurvey.jsp'))return new Response(`<!doctype html><html><head><title>Legacy frameset</title></head><frameset><frame src="${ORIGIN}/portal/courseRegStu/registration/studentRegistrationSurvey.jsp?passid=${encodeURIComponent(token)}"></frameset></html>`,{headers:{'content-type':'text/html'}});
  if(pathname.endsWith('/studentRegistrationSurvey.jsp'))return new Response(`<!doctype html><p>Synthetic account marker</p><a href="${ORIGIN+path}">Course Timetable Preview</a>`,{headers:{'content-type':'text/html'}});
  const split=token.slice(0,Math.floor(token.length/2))+'<span>'+token.slice(Math.floor(token.length/2))+'</span>';
  return new Response(`<!doctype html><p>Synthetic account marker</p><a href="${path}">Refresh preview</a><a href="#course">Same page</a><form action="/portal/courseRegStu/loginProSurvey.jsp" method="post" onsubmit="event.preventDefault();return false;"><button>Cancelled action</button></form><div id="course"></div>${preview.replace('Synthetic lecture note','Synthetic lecture note '+split).replace('<td>KA101</td>',`<td><a href="${path}">KA101</a><input type="hidden" value="${token}"></td>`)}`,{headers:{'content-type':'text/html'}});
};
const proxy=createProxyServer({config:{publicOrigin,plannerOrigin,host:'127.0.0.1',port:4187,secureCookies:false,trustedProxyIP:'127.0.0.1'},transport,clock:()=>now,bridgeSource:await readFile('dist-proxy/bridge.js','utf8'),log:event=>process.stdout.write(JSON.stringify(event)+'\n')});
await build({configFile:false,plugins:[react()],build:{outDir:root,emptyOutDir:true,rolldownOptions:{input:'tests/proxy-browser/index.html'}},logLevel:'error'});
const server=createServer(async(req,res)=>{
  try{
    if(req.headers.host!=='127.0.0.1:4177'){res.writeHead(400);res.end();return;}
    if(req.url==='/__fixture/expire'&&req.method==='POST'&&req.headers.origin===plannerOrigin){now+=15*60_000;res.writeHead(204);res.end();return;}
    if(req.method!=='GET'){res.writeHead(405);res.end();return;}
    const path=resolve(root,'.'+(req.url==='/'?'/tests/proxy-browser/index.html':new URL(req.url??'/',plannerOrigin).pathname));
    if(!path.startsWith(root+sep)||(await stat(path)).isDirectory()){res.writeHead(404);res.end();return;}
    res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'} as Record<string,string>)[extname(path)]??'application/octet-stream');res.setHeader('cache-control','no-store');res.end(await readFile(path));
  }catch{res.writeHead(404);res.end();}
});
await new Promise<void>(resolve=>proxy.server.listen(4187,'127.0.0.1',resolve));await new Promise<void>(resolve=>server.listen(4177,'127.0.0.1',resolve));
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{void proxy.close();server.closeAllConnections();server.close();});
