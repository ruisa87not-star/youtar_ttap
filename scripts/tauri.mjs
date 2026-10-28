import {spawn,spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {dirname,join,delimiter} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const env={...process.env};
// rustc may otherwise choose a newer incomplete Visual Studio installation.
if(process.platform==='win32'){
  const locator=join(env['ProgramFiles(x86)']??'C:\\Program Files (x86)','Microsoft Visual Studio','Installer','vswhere.exe');
  if(existsSync(locator)){
    const detected=spawnSync(locator,['-latest','-products','*','-requires','Microsoft.VisualStudio.Component.VC.Tools.x86.x64','-property','installationPath'],{encoding:'utf8',windowsHide:true});
    const installation=detected.stdout?.trim();
    if(detected.status===0&&installation){
      const setup=join(installation,'Common7','Tools','VsDevCmd.bat');
      const configured=spawnSync(env.ComSpec??'cmd.exe',['/d','/s','/c',`call "${setup}" -arch=x64 -host_arch=x64 >nul && set`],{encoding:'utf8',windowsHide:true,windowsVerbatimArguments:true});
      if(configured.status!==0)throw Error('The MSVC development environment could not be loaded.');
      for(const line of configured.stdout.split(/\r?\n/)){
        const index=line.indexOf('=');if(index<=0)continue;const key=line.slice(0,index);
        for(const existing of Object.keys(env))if(existing.toLowerCase()===key.toLowerCase())delete env[existing];
        env[key]=line.slice(index+1);
      }
      const tools=env.VCToolsInstallDir;
      if(tools)env.CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER=join(tools,'bin','Hostx64','x64','link.exe');
    }
  }
}
const localCargo=join(root,'.cache','cargo');
if(existsSync(join(localCargo,'bin','cargo.exe'))){
  env.CARGO_HOME=localCargo;env.RUSTUP_HOME=join(root,'.cache','rustup');
  const currentPath=env.PATH??env.Path??'';delete env.PATH;delete env.Path;
  env.Path=join(localCargo,'bin')+delimiter+currentPath;
}
env.CARGO_BUILD_JOBS??='4';
const [mode,...args]=process.argv.slice(2);
const cargo=mode==='cargo';
const executable=cargo?(env.CARGO_HOME?join(env.CARGO_HOME,'bin','cargo.exe'):'cargo'):process.execPath;
const commandArgs=cargo?args:[join(root,'node_modules','@tauri-apps','cli','tauri.js'),mode,...args];
const child=spawn(executable,commandArgs,{cwd:cargo?join(root,'src-tauri'):root,env,stdio:'inherit',windowsHide:true});
child.on('error',error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
