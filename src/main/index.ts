import {app,BrowserWindow,Menu,net,protocol,screen,session} from 'electron';
import {join,resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {registerMainIpc} from './ipc';
import {installCloseGuard} from './close';
import {initialWindowBounds} from './windowBounds';
import {createRegistrationView} from './registration';

protocol.registerSchemesAsPrivileged([{scheme:'ttap',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
const productionURL='ttap://app/index.html';
const csp="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; worker-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
app.whenReady().then(()=>{
  const root=resolve(import.meta.dirname,'../renderer');
  protocol.handle('ttap',async request=>{
    const url=new URL(request.url);
    if(request.method!=='GET'||url.host!=='app'||url.search||!/^\/(?:index\.html|assets\/[A-Za-z0-9_.-]+\.(?:js|css|png))$/.test(url.pathname))return new Response('Not found',{status:404});
    const path=resolve(root,'.'+url.pathname);
    if(!path.startsWith(root+sep))return new Response('Not found',{status:404});
    try{const result=await net.fetch(pathToFileURL(path).href);const headers=new Headers(result.headers);headers.set('Content-Security-Policy',csp);return new Response(result.body,{status:result.status,headers});}
    catch{return new Response('Not found',{status:404});}
  });
  session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  session.defaultSession.setPermissionCheckHandler(()=>false);
  Menu.setApplicationMenu(null);
  const window=new BrowserWindow({...initialWindowBounds(screen.getPrimaryDisplay().workArea),show:false,title:'youtar_ttap',icon:join(app.getAppPath(),'src/assets/fork-logo.png'),backgroundColor:'#f3f6fa',webPreferences:{preload:join(import.meta.dirname,'../preload/index.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true}});
  window.once('ready-to-show',()=>{window.maximize();window.show();});
  const devURL=!app.isPackaged?process.env.ELECTRON_RENDERER_URL:undefined;
  const trustedURL=devURL??productionURL;
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{const target=new URL(url);target.hash='';if(target.href!==trustedURL)event.preventDefault();});
  window.webContents.on('will-attach-webview',event=>event.preventDefault());
  registerMainIpc(window,trustedURL,installCloseGuard(window),createRegistrationView(window));
  void window.loadURL(trustedURL);
});
app.on('window-all-closed',()=>app.quit());
