import {defineConfig} from 'electron-vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'node:path';
export default defineConfig({
  main:{build:{lib:{entry:resolve('src/main/index.ts'),formats:['es']},rollupOptions:{output:{entryFileNames:'index.js'}}}},
  preload:{build:{lib:{entry:resolve('src/preload/index.ts'),formats:['cjs']},rollupOptions:{output:{entryFileNames:'index.cjs'}}}},
  renderer:{root:'.',base:'./',plugins:[react()],build:{outDir:'out/renderer',rollupOptions:{input:resolve('index.html')}}},
});
