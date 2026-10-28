import type {DesktopBridge} from '../shared/bridge';
import type {FileOutcome} from '../shared/model';
import {encodeProject} from '../shared/project';
import {decodePng} from '../shared/png';

export type InvokePort=(command:string,args?:Record<string,unknown>)=>Promise<unknown>;
export type ListenPort=(event:string,handler:(payload?:unknown)=>void)=>Promise<()=>void>;

export function createTauriBridge(invoke:InvokePort,listen:ListenPort):DesktopBridge{
  let dirtySequence=0,boundsSequence=0;
  async function file<T>(command:string,args?:Record<string,unknown>):Promise<FileOutcome<T>>{
    try{
      const result=await invoke(command,args);
      if(result&&typeof result==='object'&&'status' in result){
        if(result.status==='cancelled')return {status:'cancelled'};
        if(result.status==='ok'&&'value' in result)return result as FileOutcome<T>;
        if(result.status==='error'&&'message' in result&&typeof result.message==='string')return {status:'error',message:result.message.slice(0,500)};
      }
      throw new Error('Invalid native response.');
    }catch{return {status:'error',message:'The native file operation failed. Check the file size, format and folder permissions.'};}
  }
  const send=(command:string,args:Record<string,unknown>)=>{void invoke(command,args).catch(()=>{/* A closing window cannot accept one-way updates. */});};
  return {
    pickHtml:()=>file('ttap_pick_html'),
    openProject:()=>file('ttap_open_project'),
    async exportProject(project){
      const encoded=encodeProject(project);return encoded.ok?file('ttap_export_project',{text:encoded.value}):{status:'error',message:encoded.errors.join(' ')};
    },
    async exportImage(png){
      try{decodePng(png);}catch{return {status:'error',message:'Choose a valid PNG image no larger than 10 MiB.'};}
      return file('ttap_export_image',{png});
    },
    async openRegistration(){await invoke('ttap_open_registration');},
    setRegistrationBounds(bounds){send('ttap_registration_bounds',{bounds,sequence:++boundsSequence});},
    async getRegistrationStatus(){return await invoke('ttap_registration_status') as Awaited<ReturnType<DesktopBridge['getRegistrationStatus']>>;},
    async reloadRegistration(){await invoke('ttap_reload_registration');},
    readRegistrationPage:()=>file('ttap_read_registration'),
    setDirty(dirty){send('ttap_set_dirty',{dirty,sequence:++dirtySequence});},
    onCloseRequested(handler){
      let active=true,unlisten:(()=>void)|undefined;
      void listen('ttap-close-requested',request=>{if(active){if(typeof request==='number')send('ttap_acknowledge_close',{request});handler();}}).then(stop=>{if(active)unlisten=stop;else stop();}).catch(()=>{/* Native close protection retains its fallback dialog. */});
      return ()=>{if(!active)return;active=false;unlisten?.();};
    },
    async confirmClose(){await invoke('ttap_confirm_close');},
  };
}

export async function installTauriBridge():Promise<void>{
  const [{invoke},{listen}]=await Promise.all([import('@tauri-apps/api/core'),import('@tauri-apps/api/event')]);
  window.ttap=createTauriBridge(invoke,(event,handler)=>listen(event,message=>handler(message.payload)));
}
