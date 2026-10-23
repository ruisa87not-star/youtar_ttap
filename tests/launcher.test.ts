// @vitest-environment node
import {mkdtemp,mkdir,writeFile,utimes,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {expect,it} from 'vitest';

it.skipIf(process.platform!=='win32')('launcher detects current, stale and missing packages before opening a window',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'ttap-launcher-'));
  expect(resolve(directory).startsWith(join(resolve(tmpdir()),'ttap-launcher-'))).toBe(true);
  try{
    await mkdir(join(directory,'src'),{recursive:true});await mkdir(join(directory,'release/win-unpacked/resources'),{recursive:true});
    const source=join(directory,'src/renderer.tsx');const archive=join(directory,'release/win-unpacked/resources/app.asar');
    await writeFile(source,'source');await writeFile(archive,'archive');await writeFile(join(directory,'release/win-unpacked/youtar_ttap.exe'),'fixture; never executed');
    const older=new Date(Date.now()-60000);const newer=new Date(Date.now()-30000);
    await utimes(source,older,older);await utimes(archive,newer,newer);
    for(const name of ['package.json','package-lock.json','index.html','electron.vite.config.ts','electron-builder.yml']){const path=join(directory,name);await writeFile(path,'fixture');await utimes(path,older,older);}
    await utimes(join(directory,'src'),older,older);
    const check=()=>spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',resolve('scripts/start-youtar_ttap.ps1'),'-AppDirectory',directory,'-CheckOnly'],{encoding:'utf8',windowsHide:true});
    const current=check();expect(current.stdout).toContain('Current');expect(current.status).toBe(0);
    await utimes(source,new Date(),new Date());const stale=check();expect(stale.stdout).toContain('Stale');expect(stale.status).toBe(2);
    await rm(source);const deleted=check();expect(deleted.stdout).toContain('Stale');expect(deleted.status).toBe(2);
    await utimes(join(directory,'src'),older,older);await rm(join(directory,'electron-builder.yml'));const configDeleted=check();expect(configDeleted.stdout).toContain('Stale');expect(configDeleted.status).toBe(2);
    await mkdir(join(directory,'node_modules/electron-builder'),{recursive:true});
    await writeFile(join(directory,'package.json'),JSON.stringify({scripts:{'package:win':'node -e "process.exit(17)"'}}));
    const failedBuild=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',resolve('scripts/start-youtar_ttap.ps1'),'-AppDirectory',directory],{encoding:'utf8',windowsHide:true});
    expect(failedBuild.status).toBe(1);expect(failedBuild.stdout).toContain('Build failed. The previous package was not launched.');
    await rm(archive);const missing=check();expect(missing.stdout).toContain('Missing');expect(missing.status).toBe(2);
  }finally{await rm(directory,{recursive:true,force:true});}
},15000);
