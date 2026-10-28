// @vitest-environment node
import {expect,it,vi} from 'vitest';
import {SessionStore,bindPassid,assertPassid,rememberCookies,sessionIdFromCookie} from '../../server/registration-proxy/sessions.ts';
import {LOGIN} from '../../server/registration-proxy/policy.ts';
it('uses independent private cookie jars and session-bound passids, clearing both on logout',()=>{
  const store=new SessionStore(),a=store.create(),b=store.create();expect(a.id).toMatch(/^[a-f0-9]{64}$/);expect(a.csrf).toMatch(/^[a-f0-9]{64}$/);expect(a.id).not.toBe(b.id);
  rememberCookies(a,new Headers({'set-cookie':'JSESSIONID=synthetic-A; Path=/; Secure; HttpOnly'}),new URL(LOGIN));bindPassid(a,'synthetic-A');
  expect(a.jar.getCookieStringSync(LOGIN)).toContain('synthetic-A');expect(b.jar.getCookieStringSync(LOGIN)).toBe('');
  const destination=new URL('https://unitreg.utar.edu.my/portal/courseRegStu/indexSurvey.jsp?passid=synthetic-A');expect(()=>assertPassid(a,destination)).not.toThrow();expect(()=>assertPassid(b,destination)).toThrow();
  store.delete(a.id);expect(store.get(a.id)).toBeUndefined();expect(a.passids.size).toBe(0);expect(a.jar.getCookieStringSync(LOGIN)).toBe('');
});
it('destroys idle cookies/tokens even when no further requests arrive',()=>{
  vi.useFakeTimers();const store=new SessionStore();try{const s=store.create();bindPassid(s,'synthetic-retention');vi.advanceTimersByTime(15*60_000);expect(s.destroyed).toBe(true);expect(s.passids.size).toBe(0);expect(()=>bindPassid(s,'late')).toThrow();}finally{store.close();vi.useRealTimers();}
});
it('expires by idle and absolute lifetime and bounds active sessions',()=>{
  let now=0;const store=new SessionStore(()=>now);const a=store.create();now=15*60_000;expect(store.get(a.id)).toBeUndefined();
  const b=store.create();for(let i=0;i<8;i++){now+=14*60_000;expect(store.get(b.id)).toBeDefined();}now+=8*60_000;expect(store.get(b.id)).toBeUndefined();
  const full=new SessionStore();for(let i=0;i<200;i++)full.create();expect(()=>full.create()).toThrow();expect(full.size).toBe(200);
});
it('rejects ambiguous or forged session cookies, oversized cookie jars and token budgets',()=>{
  const s=new SessionStore().create(),name='__Host-ttap-registration';expect(sessionIdFromCookie(`${name}=${s.id}; unrelated=synthetic-main-secret`,true)).toBe(s.id);
  expect(sessionIdFromCookie(`${name}=${s.id}; ${name}=${s.id}`,true)).toBeUndefined();expect(sessionIdFromCookie(`${name}=forged`,true)).toBeUndefined();
  expect(()=>rememberCookies(s,new Headers({'set-cookie':'x='+ 'x'.repeat(2049)}),new URL(LOGIN))).toThrow();
  for(let i=0;i<16;i++)bindPassid(s,'synthetic-'+i);expect(()=>bindPassid(s,'synthetic-overflow')).toThrow();expect(()=>bindPassid(s,'x'.repeat(513))).toThrow();
});
