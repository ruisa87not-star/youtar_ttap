import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {readFileSync} from 'node:fs';
import {buildRegistrationScript} from './src/shared/registrationScripts.ts';
export default defineConfig(({command})=>({
  base:'./',plugins:[react(),{name:'tauri-native-resources',generateBundle(){
    this.emitFile({type:'asset',fileName:'native-registration.js',source:buildRegistrationScript()});
    for(const name of ['LICENSE','THIRD_PARTY_NOTICES.txt','UPSTREAM.md'])this.emitFile({type:'asset',fileName:name,source:readFileSync(name,'utf8')});
  },transformIndexHtml(html){
    if(command!=='serve')return html;
    // The shared Web entry has a stricter connect-src; use the native dev policy here.
    const {devCsp}=JSON.parse(readFileSync('src-tauri/tauri.conf.json','utf8')).app.security as {devCsp:string};
    return html.replace(/(<meta http-equiv="Content-Security-Policy" content=")[^"]*(")/,(_match,prefix:string,suffix:string)=>prefix+devCsp.replaceAll('"','&quot;')+suffix);
  }}],
  build:{outDir:'dist-tauri',emptyOutDir:true,target:'es2022',minify:true},
  server:{host:'127.0.0.1',port:1420,strictPort:true},
}));
