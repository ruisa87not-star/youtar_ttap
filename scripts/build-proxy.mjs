import {rolldown} from 'rolldown';
const bundle=await rolldown({input:'src/renderer/registration/proxyBridge.ts',platform:'browser'});
try{await bundle.write({file:'dist-proxy/bridge.js',format:'iife',minify:true});}finally{await bundle.close();}
