import type { FileOutcome, HtmlSource } from '../shared/model';
import { MAX_IMPORT_BYTES } from '../shared/project';
export async function readUtf8File(file: File): Promise<string> {
  const buffer = await new Promise<ArrayBuffer>((resolve,reject)=>{
    const reader = new FileReader(); reader.onerror=()=>reject(new Error('The file could not be read.'));
    reader.onload=()=>resolve(reader.result as ArrayBuffer); reader.readAsArrayBuffer(file);
  });
  return new TextDecoder('utf-8',{fatal:true}).decode(buffer);
}
export async function readHtmlFiles(files: File[]): Promise<FileOutcome<HtmlSource[]>> {
  if (!files.length) return {status:'cancelled'};
  if (files.some(f=>!/\.html?$/i.test(f.name)) || files.reduce((n,f)=>n+f.size,0)>MAX_IMPORT_BYTES) return {status:'error',message:'Choose HTML files totaling no more than 10 MiB.'};
  try {
    const value: HtmlSource[] = [];
    for (const file of files) {
      value.push({name:file.name,text:await readUtf8File(file)});
    }
    return {status:'ok',value};
  } catch { return {status:'error',message:'The HTML files could not be read as UTF-8 text.'}; }
}
