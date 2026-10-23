import {promises as fs} from 'node:fs';
import {basename,dirname,join} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {HtmlSource,Project} from '../shared/model';
import {encodeProject,MAX_IMPORT_BYTES} from '../shared/project';

async function readBounded(path:string,limit=MAX_IMPORT_BYTES):Promise<{text:string;bytes:number}>{
  const file=await fs.open(path,'r');
  try{
    const stat=await file.stat();
    if(!stat.isFile())throw new Error('Choose a regular file.');
    if(stat.size>limit)throw new Error('Files must total no more than 10 MiB.');
    // A bounded read also catches a file growing after the size check.
    const buffer=Buffer.alloc(limit+1);let bytes=0;
    while(bytes<buffer.length){const read=await file.read(buffer,bytes,buffer.length-bytes,null);if(!read.bytesRead)break;bytes+=read.bytesRead;}
    if(bytes>limit)throw new Error('Files must total no more than 10 MiB.');
    return {text:new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,bytes)),bytes};
  }finally{await file.close();}
}
export async function readHtmlPaths(paths:string[]):Promise<HtmlSource[]>{
  if(paths.some(path=>!/\.html?$/i.test(path)))throw new Error('Choose HTML files.');
  const stats=await Promise.all(paths.map(path=>fs.stat(path)));
  if(stats.reduce((total,stat)=>total+stat.size,0)>MAX_IMPORT_BYTES)throw new Error('Files must total no more than 10 MiB.');
  const sources:HtmlSource[]=[];let remaining=MAX_IMPORT_BYTES;
  for(const path of paths){const read=await readBounded(path,remaining);remaining-=read.bytes;sources.push({name:basename(path),text:read.text});}
  return sources;
}
export async function readProjectText(path:string):Promise<{name:string;text:string}>{
  return {name:basename(path),text:(await readBounded(path)).text};
}
export async function writeProjectAtomically(path:string,project:Project):Promise<void>{
  const encoded=encodeProject(project);if(!encoded.ok)throw new Error(encoded.errors.join(' '));
  await writeAtomically(path,encoded.value);
}
export async function writeImageAtomically(path:string,png:Uint8Array):Promise<void>{await writeAtomically(path,png);}
async function writeAtomically(path:string,data:string|Uint8Array):Promise<void>{
  const temporary=join(dirname(path),`.ttap-${randomUUID()}.tmp`);
  try{
    const file=await fs.open(temporary,'wx',0o600);
    try{await file.writeFile(data);await file.sync();}finally{await file.close();}
    await fs.rename(temporary,path);
  }finally{await fs.rm(temporary,{force:true});}
}
