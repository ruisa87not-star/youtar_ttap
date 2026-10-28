import {randomBytes} from 'node:crypto';
import {CookieJar} from 'tough-cookie';
import {ORIGIN} from './policy.ts';
import {ProxyError} from './types.ts';
export interface Session {
  id:string;csrf:string;created:number;touched:number;jar:CookieJar;passids:Set<string>;active:number;destroyed:boolean;controllers:Set<AbortController>;
  navigation?:{target:string;hops:number;started:number};
}
export class SessionStore {
  private records=new Map<string,Session>();private clock:()=>number;private timer?:ReturnType<typeof setTimeout>;
  constructor(clock:()=>number=Date.now){this.clock=clock;}
  private reap(){const now=this.clock();for(const s of this.records.values())if(now-s.created>=2*60*60_000||now-s.touched>=15*60_000)this.delete(s.id);}
  private schedule(){
    clearTimeout(this.timer);this.timer=undefined;if(!this.records.size)return;
    const next=Math.min(...[...this.records.values()].map(s=>Math.min(s.created+2*60*60_000,s.touched+15*60_000)));
    this.timer=setTimeout(()=>{this.reap();this.schedule();},Math.max(1,next-this.clock()));this.timer.unref();
  }
  get size(){this.reap();return this.records.size;}
  create():Session{
    this.reap();if(this.records.size>=200)throw new ProxyError(503,'session_capacity');const now=this.clock();
    const s:Session={id:randomBytes(32).toString('hex'),csrf:randomBytes(32).toString('hex'),created:now,touched:now,jar:new CookieJar(undefined,{rejectPublicSuffixes:true,prefixSecurity:'strict',allowSpecialUseDomain:false}),passids:new Set(),active:0,destroyed:false,controllers:new Set()};
    this.records.set(s.id,s);this.schedule();return s;
  }
  get(id:string|undefined):Session|undefined{this.reap();if(!id||!id.match(/^[a-f0-9]{64}$/))return;const s=this.records.get(id);if(s){s.touched=this.clock();this.schedule();}return s;}
  delete(id:string){const s=this.records.get(id);if(s){s.destroyed=true;for(const controller of s.controllers)controller.abort();s.controllers.clear();s.passids.clear();s.jar.removeAllCookiesSync();s.csrf='';this.records.delete(id);this.schedule();}}
  close(){for(const id of this.records.keys())this.delete(id);clearTimeout(this.timer);this.timer=undefined;}
}
export const cookieName=(secure:boolean)=>secure?'__Host-ttap-registration':'ttap-registration-fixture';
export function sessionIdFromCookie(header:string|undefined,secure:boolean):string|undefined{
  const name=cookieName(secure),matches=(header??'').split(';').map(part=>part.trim()).filter(part=>part.startsWith(name+'='));if(matches.length!==1)return;
  const id=matches[0].slice(name.length+1);return /^[a-f0-9]{64}$/.test(id)?id:undefined;
}
export function bindPassid(s:Session,value:string){
  if(s.destroyed)throw new ProxyError(401,'session_expired');
  if(!value||value.length>512||Array.from(value).some(c=>c.charCodeAt(0)<32||c.charCodeAt(0)===127)||(!s.passids.has(value)&&s.passids.size>=16))throw new ProxyError(502,'upstream_token_limit');s.passids.add(value);
}
export function assertPassid(s:Session,url:URL){
  if(s.destroyed)throw new ProxyError(401,'session_expired');const values=url.searchParams.getAll('passid');
  if(url.origin!==ORIGIN||values.length>1||values.some(value=>!s.passids.has(value)))throw new ProxyError(403,'invalid_session_token');
}
export function rememberCookies(s:Session,headers:Headers,url:URL){
  if(s.destroyed)throw new ProxyError(401,'session_expired');if(url.origin!==ORIGIN)throw new ProxyError(502,'invalid_upstream_cookie');
  const cookies=headers.getSetCookie();if(cookies.length>32||cookies.some(value=>Buffer.byteLength(value)>2048))throw new ProxyError(502,'upstream_cookie_limit');
  try{for(const value of cookies)s.jar.setCookieSync(value,url.href);const snapshot=s.jar.serializeSync();if(!snapshot||(snapshot.cookies?.length??0)>128){s.jar.removeAllCookiesSync();throw Error();}}
  catch{throw new ProxyError(502,'invalid_upstream_cookie');}
}
