import {test,expect,_electron,type ElectronApplication} from '@playwright/test';
import {existsSync,mkdtempSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const {version}=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url),'utf8')) as {version:string};
function registeredInstallations(){return execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@(Get-ItemProperty 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' -ErrorAction SilentlyContinue | Where-Object DisplayName -Like 'youtar_ttap*').Count"],{encoding:'utf8'}).trim();}

test('the Windows installer runs without Node.js and its uninstaller removes the test installation',async({browserName: _browserName},info)=>{
  const installer=resolve('release',`youtar_ttap-Setup-${version}-x64.exe`);
  expect(existsSync(installer),`Build the Windows installer first: ${installer}`).toBe(true);
  // Refuse to overwrite an installation or shortcuts belonging to the user.
  const existing=registeredInstallations();
  expect(existing,'A youtar_ttap installation already exists; use a separate Windows test account.').toBe('0');
  const shortcuts=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"@([Environment]::GetFolderPath('DesktopDirectory'),[Environment]::GetFolderPath('Programs')) | ConvertTo-Json -Compress"],{encoding:'utf8'})) as string[];
  const links=shortcuts.map(directory=>join(directory,'youtar_ttap.lnk'));expect(links.some(existsSync),'Do not replace existing youtar_ttap shortcuts.').toBe(false);
  const root=mkdtempSync(resolve('release/installer-smoke-')),directory=join(root,'youtar_ttap'),executable=join(directory,'youtar_ttap.exe');
  const env:Record<string,string>={};for(const[key,value]of Object.entries(process.env))if(value!==undefined)env[key]=value;
  env.PATH=`${process.env.SystemRoot}\\System32;${process.env.SystemRoot}`;delete env.ELECTRON_RUN_AS_NODE;
  let app:ElectronApplication|undefined;
  try{
    const installed=spawnSync(installer,['/S','/currentuser',`/D=${directory}`],{env,windowsHide:true,windowsVerbatimArguments:true,timeout:120000});
    if(installed.error)throw installed.error;expect(installed.status,'Installer process must exit successfully.').toBe(0);
    await expect.poll(()=>existsSync(executable)).toBe(true);for(const link of links)expect(existsSync(link),link).toBe(true);
    app=await _electron.launch({executablePath:executable,args:[`--user-data-dir=${join(root,'profile')}`],env});
    expect(await app.evaluate(({app})=>app.getVersion())).toBe(version);expect(await app.evaluate(({app})=>app.isPackaged)).toBe(true);
    expect(await app.evaluate(({app})=>app.getPath('userData'))).toBe(join(root,'profile'));
    const page=await app.firstWindow();await expect(page).toHaveTitle(`youtar_ttap ${version}`);
    await expect.poll(()=>app!.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isMaximized())).toBe(true);
    const html='<!doctype html><h1>Installer test login fixture</h1>';
    await app.evaluate(({session},html)=>{session.fromPartition('ttap-registration').protocol.handle('https',()=>new Response(html,{headers:{'content-type':'text/html'}}));},html);
    await page.getByRole('button',{name:'Skip tutorial'}).click();await page.getByRole('button',{name:'Try demo'}).click();await page.getByRole('checkbox',{name:/^TEST1013 /}).check();await expect(page.getByText('Option 1 of 2')).toBeVisible();
    const png=info.outputPath('installed-registration-guide.png');await app.evaluate(({dialog},filePath)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath});},png);await page.getByRole('button',{name:'Export image'}).click();await expect(page.getByText('Saved installed-registration-guide.png.')).toBeVisible();expect([...readFileSync(png).subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
    await page.screenshot({path:info.outputPath('installed-app.png')});
  }finally{
    if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(win=>win.destroy())).catch(()=>{});await app.close();}
    if(existsSync(directory)){
      const uninstaller=join(directory,'Uninstall youtar_ttap.exe');
      if(existsSync(uninstaller))execFileSync(uninstaller,['/S','/currentuser'],{windowsHide:true,timeout:120000});
    }
  }
  await expect.poll(()=>existsSync(executable),{timeout:30000}).toBe(false);for(const link of links)await expect.poll(()=>existsSync(link)).toBe(false);
  expect(registeredInstallations()).toBe('0');
});
