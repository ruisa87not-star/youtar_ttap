import {createHmac,randomBytes} from 'node:crypto';
import type {Session} from './sessions.ts';
import {ProxyError} from './types.ts';
export class Limiter {
  private entries=new Map<string,{count:number;expires:number}>();private clock:()=>number;private capacity:number;private timer?:ReturnType<typeof setTimeout>;
  constructor(clock:()=>number=Date.now,capacity=2000){this.clock=clock;this.capacity=capacity;}
  get size(){return this.entries.size;}
  keys(){return [...this.entries.keys()];}
  private schedule(){if(this.timer||!this.entries.size)return;const next=Math.min(...[...this.entries.values()].map(item=>item.expires));this.timer=setTimeout(()=>{this.timer=undefined;for(const [key,item] of this.entries)if(item.expires<=this.clock())this.entries.delete(key);this.schedule();},Math.max(1,next-this.clock()));this.timer.unref();}
  close(){clearTimeout(this.timer);this.timer=undefined;this.entries.clear();}
  take(key:string,max:number,windowMs=60_000):boolean{
    const now=this.clock();let entry=this.entries.get(key);if(entry&&entry.expires<=now){this.entries.delete(key);entry=undefined;}
    if(!entry){if(this.entries.size>=this.capacity){for(const [key,item] of this.entries)if(item.expires<=now)this.entries.delete(key);if(this.entries.size>=this.capacity)return false;}entry={count:0,expires:now+windowMs};this.entries.set(key,entry);}
    if(entry.count>=max)return false;entry.count++;this.schedule();return true;
  }
}
export class ServiceLimits {
  private limiter:Limiter;private salt=randomBytes(32);private active=0;
  constructor(clock:()=>number=Date.now){this.limiter=new Limiter(clock);}
  private visitor(ip:string){return createHmac('sha256',this.salt).update(ip).digest('hex');}
  creation(ip:string){if(!this.limiter.take('create:'+this.visitor(ip),10))throw new ProxyError(429,'rate_limit');}
  login(ip:string,sessionId:string){if(!this.limiter.take('login-peer:'+this.visitor(ip),20)||!this.limiter.take('login-session:'+sessionId,5))throw new ProxyError(429,'rate_limit');}
  debugKeys(){return this.limiter.keys();}
  close(){this.limiter.close();this.salt.fill(0);}
  acquire(s:Session):()=>void{
    if(s.destroyed)throw new ProxyError(401,'session_expired');if(this.active>=40||s.active>=4)throw new ProxyError(429,'concurrency_limit');this.active++;s.active++;let released=false;
    return ()=>{if(!released){released=true;this.active--;s.active--;}};
  }
}
