import {isIP} from 'node:net';
import {getPublicSuffix} from 'tough-cookie';
import {ProxyError,type ProxyConfig} from './types.ts';
function origin(value:string|undefined):URL{
  try{
    if(!value||value.trim()!==value)throw Error();const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash||url.port||isIP(url.hostname)||url.hostname==='localhost'||url.hostname.endsWith('.'))throw Error();
    if(!getPublicSuffix(url.hostname))throw Error();return url;
  }catch{throw new ProxyError(500,'invalid_proxy_origins');}
}
export function readConfig(env:Record<string,string|undefined>):ProxyConfig{
  const proxy=origin(env.PROXY_PUBLIC_ORIGIN),planner=origin(env.PLANNER_ORIGIN);
  if(proxy.hostname===planner.hostname||getPublicSuffix(proxy.hostname)!==getPublicSuffix(planner.hostname))throw new ProxyError(500,'invalid_proxy_origins');
  const host=env.PROXY_BIND_HOST??'127.0.0.1',port=Number(env.PROXY_PORT??3000),trustedProxyIP=env.PROXY_TRUSTED_IP;
  if(!['127.0.0.1','::1','0.0.0.0'].includes(host)||!Number.isInteger(port)||port<1024||port>65535||(trustedProxyIP&&!isIP(trustedProxyIP)))throw new ProxyError(500,'invalid_proxy_listener');
  return {publicOrigin:proxy.origin,plannerOrigin:planner.origin,host,port,secureCookies:true,...(trustedProxyIP?{trustedProxyIP}:{})};
}
