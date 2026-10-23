import type {FilePort} from './files';
import {readHtmlFiles,readUtf8File} from './browserFiles';
import {encodeProject,MAX_IMPORT_BYTES} from '../shared/project';
import {decodePng} from '../shared/png';

function pickFiles(accept:string,multiple=false):Promise<File[]> {
  return new Promise(resolve=>{
    const input=document.createElement('input');
    input.type='file';input.accept=accept;input.multiple=multiple;input.hidden=true;
    const finish=(files:File[])=>{input.remove();resolve(files);};
    input.addEventListener('change',()=>finish(Array.from(input.files??[])),{once:true});
    input.addEventListener('cancel',()=>finish([]),{once:true});
    document.body.append(input);input.click();
  });
}
export const browserFilePort:FilePort={
  async exportImage(png){
    try{
      const bytes=decodePng(png);const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'image/png'}));
      const name='my-timetable.png';const anchor=document.createElement('a');anchor.href=url;anchor.download=name;document.body.append(anchor);
      try{anchor.click();}finally{anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
      return {status:'ok',value:{kind:'downloaded',name}};
    }catch{return {status:'error',message:'The timetable image download could not be started. Try fewer courses or another browser.'};}
  },
  async pickHtml(){return readHtmlFiles(await pickFiles('.html,.htm',true));},
  async openProject(){
    const [file]=await pickFiles('.ttap.json,.json');
    if(!file)return {status:'cancelled'};
    if(file.size>MAX_IMPORT_BYTES)return {status:'error',message:'Project files must be no larger than 10 MiB.'};
    try{return {status:'ok',value:{name:file.name,text:await readUtf8File(file)}};}
    catch{return {status:'error',message:'The project could not be read as UTF-8 text.'};}
  },
  async exportProject(project){
    const encoded=encodeProject(project);
    if(!encoded.ok)return {status:'error',message:encoded.errors.join(' ')};
    try{
      const url=URL.createObjectURL(new Blob([encoded.value],{type:'application/json'}));
      const name='my-timetable.ttap.json';const anchor=document.createElement('a');
      anchor.href=url;anchor.download=name;document.body.append(anchor);
      try{anchor.click();}finally{anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
      return {status:'ok',value:{kind:'downloaded',name}};
    }catch{return {status:'error',message:'The project download could not be started.'};}
  },
};
