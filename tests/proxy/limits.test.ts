// @vitest-environment node
import {expect,it,vi} from 'vitest';
import {Limiter,ServiceLimits} from '../../server/registration-proxy/limits.ts';
import {SessionStore} from '../../server/registration-proxy/sessions.ts';
it('clears expired visitor keys without requiring new traffic',()=>{
  vi.useFakeTimers();const limiter=new Limiter();try{limiter.take('synthetic-hashed-visitor',1);vi.advanceTimersByTime(60_000);expect(limiter.keys()).toEqual([]);}finally{vi.clearAllTimers();vi.useRealTimers();}
});
it('enforces fixed minute limits and reclaims expired keys while bounding the map',()=>{
  let now=0;const limiter=new Limiter(()=>now,2);for(let i=0;i<5;i++)expect(limiter.take('a',5)).toBe(true);expect(limiter.take('a',5)).toBe(false);
  expect(limiter.take('b',1)).toBe(true);expect(limiter.take('c',1)).toBe(false);expect(limiter.size).toBe(2);now=60_000;expect(limiter.take('c',1)).toBe(true);expect(limiter.size).toBeLessThanOrEqual(2);
});
it('limits creations and logins per visitor/session without storing a raw IP as key',()=>{
  const limits=new ServiceLimits(),s=new SessionStore().create();for(let i=0;i<10;i++)limits.creation('192.0.2.1');expect(()=>limits.creation('192.0.2.1')).toThrow();
  for(let i=0;i<5;i++)limits.login('192.0.2.1',s.id);expect(()=>limits.login('192.0.2.1',s.id)).toThrow();
  expect(limits.debugKeys().some(key=>key.includes('192.0.2.1'))).toBe(false);
  const many=new SessionStore();for(let i=0;i<20;i++)limits.login('192.0.2.2',many.create().id);expect(()=>limits.login('192.0.2.2',many.create().id)).toThrow();
});
it('caps requests at four per session and forty globally and releases exactly once',()=>{
  const limits=new ServiceLimits(),store=new SessionStore(),a=store.create(),release=Array.from({length:4},()=>limits.acquire(a));expect(()=>limits.acquire(a)).toThrow();
  release[0]();release[0]();const replacement=limits.acquire(a);replacement();release.slice(1).forEach(done=>done());
  const active=Array.from({length:40},()=>limits.acquire(store.create()));expect(()=>limits.acquire(store.create())).toThrow();active.forEach(done=>done());expect(()=>limits.acquire(a)()).not.toThrow();
});
