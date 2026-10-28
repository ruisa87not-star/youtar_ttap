import {BlockList,isIP} from 'node:net';
import {PROXY_LOGIN_PATH,PROXY_SCHEDULE_PATHS} from '../../src/shared/registrationProxy.ts';
import {ProxyError} from './types.ts';
export const ORIGIN='https://unitreg.utar.edu.my';
export const LOGIN=ORIGIN+PROXY_LOGIN_PATH;
export const LOGIN_POST='/portal/courseRegStu/loginProSurvey.jsp';
export const DOCUMENTS=new Set<string>([PROXY_LOGIN_PATH,'/portal/courseRegStu/indexSurvey.jsp','/portal/courseRegStu/registration/studentRegistrationSurvey.jsp',...PROXY_SCHEDULE_PATHS]);
export const isAsset=(path:string)=>['/portal/Kaptcha.jpg','/portal/courseRegStu/skin/main.css','/portal/courseRegStu/skin/print.css'].includes(path)||/^\/portal\/courseRegStu\/skin\/(?:images\/)?[a-zA-Z0-9_-]+\.(?:gif|png|jpe?g)$/.test(path);
const hasControl=(value:string,space=false)=>Array.from(value).some(char=>char.charCodeAt(0)<(space?33:32)||char.charCodeAt(0)===127);
export function upstreamURL(value:string|URL,base:string|URL,method:'GET'|'POST'):URL{
  let url:URL;try{if(String(value).length>4096||hasControl(String(value))||String(value).includes('\\'))throw Error();url=new URL(value,base);}catch{throw new ProxyError(400,'unsupported_url');}
  if(url.hostname!=='unitreg.utar.edu.my'||url.username||url.password||!((url.protocol==='https:'&&!url.port)||(url.protocol==='http:'&&!url.port)))throw new ProxyError(400,'unsupported_url');
  url.protocol='https:';url.port='';
  if(/[%\\]/.test(url.pathname)||!((method==='GET'&&(DOCUMENTS.has(url.pathname)||isAsset(url.pathname)))||(method==='POST'&&url.pathname===LOGIN_POST)))throw new ProxyError(403,'unsupported_route');
  const keys=new Set<string>();for(const [key,value] of url.searchParams){
    if(keys.has(key)||value.length>512||hasControl(value))throw new ProxyError(400,'invalid_query');keys.add(key);
    if(key==='passid'&&DOCUMENTS.has(url.pathname)&&value)continue;
    if(key==='message'&&url.pathname===PROXY_LOGIN_PATH&&['error','invalid-access','logout','timeout'].includes(value))continue;
    if(['t','v'].includes(key)&&isAsset(url.pathname)&&/^\d{1,16}$/.test(value))continue;
    throw new ProxyError(400,'invalid_query');
  }
  return url;
}
export function requestTarget(value:string):URL{
  const path=value.split('?')[0];
  if(value.length>4096||!value.startsWith('/')||value.startsWith('//')||value.includes('#')||path.includes('%')||path.includes('\\')||hasControl(path,true)||path.split('/').some((part,index)=>part==='.'||part==='..'||(index>0&&!part&&index!==path.split('/').length-1)))throw new ProxyError(400,'invalid_path');
  return new URL(value,ORIGIN);
}
const blocked4=new BlockList(),global6=new BlockList(),blocked6=new BlockList();
for(const [ip,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const)blocked4.addSubnet(ip,bits,'ipv4');
global6.addSubnet('2000::',3,'ipv6');
for(const [ip,bits] of [['2001::',32],['2001:db8::',32],['2001:10::',28],['2001:20::',28],['2002::',16]] as const)blocked6.addSubnet(ip,bits,'ipv6');
export function isPublicAddress(ip:string):boolean{return isIP(ip)===4?!blocked4.check(ip,'ipv4'):isIP(ip)===6&&global6.check(ip,'ipv6')&&!blocked6.check(ip,'ipv6');}
