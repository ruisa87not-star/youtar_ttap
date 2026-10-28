import { defineConfig,loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import {readConfig} from './server/registration-proxy/config.ts';
export default defineConfig(({mode})=>{
  const env={...loadEnv(mode,process.cwd(),''),...process.env},origin=env.VITE_REGISTRATION_PROXY_ORIGIN;
  const proxy=origin?readConfig({...env,PROXY_PUBLIC_ORIGIN:origin}):undefined;
  return {base:'./',define:{__TTAP_REGISTRATION_PROXY__:JSON.stringify(proxy?{origin:proxy.publicOrigin,plannerOrigin:proxy.plannerOrigin}:null)},plugins:[react(),{name:'registration-proxy-csp',transformIndexHtml(html){return proxy?html.replace('frame-src https://unitreg.utar.edu.my;',`frame-src https://unitreg.utar.edu.my ${proxy.publicOrigin};`):html;}}],build:{outDir:'dist-web',emptyOutDir:true},server:{host:'127.0.0.1'}};
});
