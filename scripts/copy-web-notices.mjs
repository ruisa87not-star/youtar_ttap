import {copyFile,stat} from 'node:fs/promises';
const output=new URL('../dist-web/',import.meta.url);
await stat(new URL('index.html',output));
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.txt','UPSTREAM.md']){
  await copyFile(new URL('../'+name,import.meta.url),new URL(name,output));
}
