import {parse,serialize,defaultTreeAdapter as tree,html,type DefaultTreeAdapterTypes as AST} from 'parse5';
import {randomBytes} from 'node:crypto';
import {loginCSS} from '../../src/shared/registrationScripts.ts';
import {PROXY_LOGIN_PATH} from '../../src/shared/registrationProxy.ts';
import {bindPassid,type Session} from './sessions.ts';
import {DOCUMENTS,upstreamURL} from './policy.ts';
import {ProxyError,type ProxyConfig} from './types.ts';
type Element=AST.Element;type Node=AST.Node;
interface Context {upstream:URL;config:ProxyConfig;session:Session;errorKind?:string;errorCode?:string;onRefresh?:(url:URL)=>void;}
const attr=(node:Element,name:string)=>node.attrs.find(item=>item.name===name)?.value;
function set(node:Element,name:string,value:string){const old=node.attrs.find(item=>item.name===name);if(old)old.value=value;else node.attrs.push({name,value});}
function removeAttr(node:Element,name:string){node.attrs=node.attrs.filter(item=>item.name!==name);}
function element(name:string,attrs:Record<string,string>={}){return tree.createElement(name,html.NS.HTML,Object.entries(attrs).map(([name,value])=>({name,value})));}
function destination(value:string,base:URL,config:ProxyConfig,session:Session,method:'GET'|'POST'='GET'):string|null{
  try{const url=upstreamURL(value,base,method);const token=url.searchParams.get('passid');if(token)bindPassid(session,token);return config.publicOrigin+url.pathname+url.search+url.hash;}catch{return null;}
}
export function rewriteRefresh(value:string,base:URL,config:ProxyConfig,session:Session):string|null{
  const match=value.match(/^\s*(\d+(?:\.\d+)?)\s*;\s*url\s*=\s*(.*?)\s*$/i);if(!match||Number(match[1])>60)return null;
  const target=destination(match[2].replace(/^["']|["']$/g,''),base,config,session);return target?`${match[1]};url=${target}`:null;
}
export function rewriteCSS(css:string,base:URL,config:ProxyConfig,session:Session):string{
  return css.replace(/@import[^;]*(?:;|$)/gi,'').replace(/url\(\s*(?:(["'])([\s\S]*?)\1|([^)]*))\s*\)/gi,(_match,_quote:string,quoted:string,unquoted:string)=>{const target=destination((quoted??unquoted??'').trim(),base,config,session);return `url(${JSON.stringify(target??'')})`;});
}
export function rewriteHTML(source:string,{upstream,config,session,errorKind,errorCode,onRefresh}:Context):string{
  if(Buffer.byteLength(source)>10*1024*1024)throw new ProxyError(502,'upstream_size');const doc=parse(source);let head:Element|undefined,body:Element|undefined,count=0;
  const stack:Array<{node:Node;depth:number}>=[{node:doc,depth:0}];let frameset:Element|undefined,root:Element|undefined;const frameTargets:URL[]=[];
  while(stack.length){const {node,depth}=stack.pop()!;if(++count>100_000||depth>128)throw new ProxyError(502,'upstream_complexity');
    if('tagName' in node){
      if(node.tagName==='head')head=node;if(node.tagName==='body')body=node;if(node.tagName==='html')root=node;if(node.tagName==='frameset'&&!frameset)frameset=node;
      if(node.tagName==='frame'){try{const url=upstreamURL(attr(node,'src')??'',upstream,'GET');if(DOCUMENTS.has(url.pathname)&&url.href!==upstream.href)frameTargets.push(url);}catch{/* Unsupported frames are removed by the URL pass. */}}
      if(['base','object','embed','svg','math'].includes(node.tagName)){tree.detachNode(node);continue;}
      if(node.tagName==='link'&&attr(node,'rel')?.toLowerCase()!=='stylesheet'){tree.detachNode(node);continue;}
      if(node.tagName==='meta'){
        if(attr(node,'name')?.toLowerCase()==='referrer'){tree.detachNode(node);continue;}
        if(attr(node,'charset'))set(node,'charset','utf-8');
        const equivalent=attr(node,'http-equiv')?.toLowerCase();
        if(equivalent==='set-cookie'){tree.detachNode(node);continue;}
        if(equivalent==='content-type')set(node,'content','text/html; charset=utf-8');
        if(equivalent==='refresh'){const value=rewriteRefresh(attr(node,'content')??'',upstream,config,session);if(!value){tree.detachNode(node);continue;}set(node,'content',value);const url=new URL(value.slice(value.indexOf('url=')+4));onRefresh?.(new URL(url.pathname+url.search,'https://unitreg.utar.edu.my'));}
      }
      if(node.tagName==='form'){
        const method=(attr(node,'method')??'get').toUpperCase();const target=(method==='GET'||method==='POST')?destination(attr(node,'action')||upstream.href,upstream,config,session,method):null;
        if(target){set(node,'action',target);set(node,'target','_self');if(method==='POST'){for(const child of [...node.childNodes])if('tagName' in child&&child.tagName==='input'&&attr(child,'name')==='_ttap_csrf')tree.detachNode(child);tree.appendChild(node,element('input',{type:'hidden',name:'_ttap_csrf',value:session.csrf}));}}
        else{set(node,'action','/__ttap/unsupported');set(node,'method','post');const pending:Node[]=[...node.childNodes];while(pending.length){const child=pending.pop()!;if('tagName' in child&&['input','select','textarea','button'].includes(child.tagName))set(child,'disabled','');if('childNodes' in child)pending.push(...child.childNodes);}}
      }
      if(node.tagName==='input'&&attr(node,'name')==='passid'){const value=attr(node,'value');if(value)bindPassid(session,value);}
      if(attr(node,'target'))set(node,'target','_self');if(attr(node,'formtarget'))set(node,'formtarget','_self');removeAttr(node,'srcset');removeAttr(node,'ping');
      for(const name of ['src','href','poster','formaction']){const value=attr(node,name);if(value===undefined)continue;const target=destination(value,upstream,config,session,name==='formaction'?'POST':'GET');if(target)set(node,name,target);else{removeAttr(node,name);if(name==='src'&&['img','script','frame','iframe'].includes(node.tagName))tree.detachNode(node);if(name==='formaction')set(node,'disabled','');}}
      const style=attr(node,'style');if(style)set(node,'style',rewriteCSS(style,upstream,config,session));
      if(node.tagName==='script'||node.tagName==='style')for(const child of node.childNodes)if('value' in child){child.value=node.tagName==='style'?rewriteCSS(child.value,upstream,config,session):child.value.replaceAll('https://unitreg.utar.edu.my',config.publicOrigin).replaceAll('http://unitreg.utar.edu.my',config.publicOrigin);}
      for(const item of node.attrs)if(item.name.startsWith('on'))item.value=item.value.replaceAll('https://unitreg.utar.edu.my',config.publicOrigin).replaceAll('http://unitreg.utar.edu.my',config.publicOrigin);
    }
    if('childNodes' in node)for(const child of [...node.childNodes].reverse())stack.push({node:child,depth:depth+1});
  }
  if(!body&&head&&root&&frameset){
    const target=frameTargets.find(url=>url.pathname.endsWith('/registration/studentRegistrationSurvey.jsp'))??frameTargets[0];if(!target)throw new ProxyError(502,'upstream_frameset');
    const href=destination(target.href,upstream,config,session)!;tree.detachNode(frameset);body=element('body');tree.appendChild(root,body);tree.appendChild(head,element('meta',{'http-equiv':'refresh',content:'0;url='+href}));const link=element('a',{href});tree.appendChild(link,tree.createTextNode('Continue to Course Registration'));tree.appendChild(body,link);onRefresh?.(target);
  }
  if(!head||!body)throw new ProxyError(502,'upstream_document');
  if(upstream.pathname===PROXY_LOGIN_PATH){const style=element('style',{id:'ttap-proxy-login-style'});tree.appendChild(style,tree.createTextNode(loginCSS));tree.appendChild(head,style);}
  tree.appendChild(body,element('script',{src:'/__ttap/bridge.js','data-parent-origin':config.plannerOrigin,'data-document-id':randomBytes(16).toString('hex'),'data-csrf':session.csrf,'data-passids':JSON.stringify([...session.passids]),...(errorKind?{'data-error-kind':errorKind,'data-error-code':errorCode??'upstream_error'}:{})}));
  return serialize(doc);
}
