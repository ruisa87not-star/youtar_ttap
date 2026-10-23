import {dialog,type BrowserWindow} from 'electron';
export function installCloseGuard(window:BrowserWindow){
  let dirty=false,allowed=false,healthy=true,fallbackPending=false,requested=false;
  function confirmClose(){allowed=true;window.close();}
  async function fallback(){
    if(fallbackPending)return;fallbackPending=true;
    try{
      const result=await dialog.showMessageBox(window,{type:'warning',title:'Keep your changes?',message:'The planner is not responding. Your unsaved changes may be lost.',buttons:['Keep open','Discard and close'],defaultId:0,cancelId:0,noLink:true});
      if(result.response===1)confirmClose();
    }finally{fallbackPending=false;}
  }
  window.on('close',event=>{
    if(allowed||!dirty)return;
    event.preventDefault();requested=true;
    if(healthy)window.webContents.send('ttap:close-requested');else void fallback();
  });
  window.on('unresponsive',()=>{healthy=false;if(requested&&dirty)void fallback();});
  window.on('responsive',()=>{healthy=true;});
  window.webContents.on('render-process-gone',()=>{healthy=false;if(requested&&dirty)void fallback();});
  return {setDirty(value:boolean){dirty=value;},confirmClose};
}
