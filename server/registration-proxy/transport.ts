import {lookup} from 'node:dns/promises';
import {request} from 'node:https';
import {Readable} from 'node:stream';
import {createGunzip,createInflate,createBrotliDecompress} from 'node:zlib';
import {isPublicAddress,upstreamURL} from './policy.ts';
import {ProxyError,type Transport} from './types.ts';

export const httpsTransport:Transport=async(input,signal)=>{
  const url=upstreamURL(input.url,input.url,input.method);
  const addresses=await lookup(url.hostname,{all:true,verbatim:true});
  if(signal.aborted)throw new ProxyError(504,'upstream_timeout');
  if(!addresses.length||addresses.some(item=>!isPublicAddress(item.address)))throw new ProxyError(502,'upstream_address');
  return new Promise((resolve,reject)=>{
    const client=request({hostname:addresses[0].address,port:443,servername:url.hostname,rejectUnauthorized:true,agent:false,
      path:url.pathname+url.search,method:input.method,headers:{...input.headers,host:url.hostname,'accept-encoding':'gzip, deflate, br'},signal},incoming=>{
      try{
        const headers=new Headers();for(let i=0;i<incoming.rawHeaders.length;i+=2)headers.append(incoming.rawHeaders[i],incoming.rawHeaders[i+1]);
        const encoding=(headers.get('content-encoding')??'identity').toLowerCase();
        const decoder=encoding==='gzip'?createGunzip():encoding==='deflate'?createInflate():encoding==='br'?createBrotliDecompress():null;
        if(!decoder&&encoding!=='identity')throw new ProxyError(502,'upstream_encoding');
        const stream=decoder?incoming.pipe(decoder):incoming;
        if(decoder)incoming.on('error',error=>decoder.destroy(error));
        resolve({status:incoming.statusCode??502,headers,body:Readable.toWeb(stream) as ReadableStream<Uint8Array>});
      }catch{incoming.destroy();reject(new ProxyError(502,'upstream_response'));}
    });
    client.on('error',()=>reject(new ProxyError(signal.aborted?504:502,signal.aborted?'upstream_timeout':'upstream_network')));
    if(input.body)client.write(input.body);client.end();
  });
};

export async function readBounded(body:ReadableStream<Uint8Array>|null,max:number,signal:AbortSignal):Promise<Uint8Array>{
  if(!body)return new Uint8Array();const reader=body.getReader(),chunks:Uint8Array[]=[];let size=0;
  const abort=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
  try{
    if(signal.aborted)throw new ProxyError(504,'upstream_timeout');
    for(;;){const item=await reader.read();if(signal.aborted)throw new ProxyError(504,'upstream_timeout');if(item.done)break;size+=item.value.byteLength;if(size>max)throw new ProxyError(502,'upstream_size');chunks.push(item.value);}
    const result=new Uint8Array(size);let offset=0;for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.byteLength;}return result;
  }catch(error){await reader.cancel().catch(()=>{});throw error;}
  finally{signal.removeEventListener('abort',abort);reader.releaseLock();}
}
