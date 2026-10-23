import {contextBridge,ipcRenderer} from 'electron';
import type {DesktopBridge} from '../shared/bridge';
const bridge:DesktopBridge={
  openRegistration:()=>ipcRenderer.invoke('ttap:open-registration'),
  setRegistrationBounds:bounds=>ipcRenderer.send('ttap:registration-bounds',bounds),
  getRegistrationStatus:()=>ipcRenderer.invoke('ttap:registration-status'),
  reloadRegistration:()=>ipcRenderer.invoke('ttap:reload-registration'),
  readRegistrationPage:()=>ipcRenderer.invoke('ttap:read-registration'),
  pickHtml:()=>ipcRenderer.invoke('ttap:pick-html'),
  openProject:()=>ipcRenderer.invoke('ttap:open-project'),
  exportProject:project=>ipcRenderer.invoke('ttap:export-project',project),
  exportImage:png=>ipcRenderer.invoke('ttap:export-image',png),
  setDirty:dirty=>ipcRenderer.send('ttap:set-dirty',dirty),
  onCloseRequested(handler){const listener=()=>handler();ipcRenderer.on('ttap:close-requested',listener);return ()=>ipcRenderer.removeListener('ttap:close-requested',listener);},
  confirmClose:()=>ipcRenderer.invoke('ttap:confirm-close'),
};
contextBridge.exposeInMainWorld('ttap',bridge);
