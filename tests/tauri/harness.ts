import {chromium,type Browser,type Page,expect} from '@playwright/test';
import {spawn,type ChildProcess} from 'node:child_process';
import {readFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';

// Only this test process gets a debugging endpoint; production config has none.
const profile=join(process.env.LOCALAPPDATA!,'com.ruisa87not-star.youtar-ttap.tauri');
export class TauriHarness{
  process!:ChildProcess;connections:Browser[]=[];page!:Page;remote!:Page;started=0;
  async connect(directory:string):Promise<Browser>{
    let browser:Browser|undefined;
    await expect.poll(async()=>{
      try{const path=join(directory,'EBWebView','DevToolsActivePort');if((await stat(path)).mtimeMs<this.started-1000)return false;
        const port=(await readFile(path,'utf8')).split('\n')[0];browser=await chromium.connectOverCDP(`http://127.0.0.1:${port}`,{timeout:1000});return true;
      }catch{return false;}
    },{timeout:25000}).toBe(true);
    this.connections.push(browser!);return browser!;
  }
  async start(){
    this.started=Date.now();
    this.process=spawn(resolve(process.env.TTAP_TAURI_EXE??'src-tauri/target/debug/youtar_ttap_tauri.exe'),[],{env:{...process.env,WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS:'--remote-debugging-port=0'},windowsHide:true,stdio:'ignore'});
    const browser=await this.connect(profile);this.page=browser.contexts()[0].pages()[0];
    await expect(this.page.getByRole('button',{name:'Skip tutorial'})).toBeVisible();
  }
  async skip(){
    await this.page.getByRole('button',{name:'Skip tutorial'}).click();
    const browser=await this.connect(join(profile,'registration'));this.remote=browser.contexts().flatMap(c=>c.pages())[0];
    const events:string[]=[];this.remote.on('domcontentloaded',()=>events.push('domcontentloaded'));this.remote.on('load',()=>events.push('load'));this.remote.on('framenavigated',frame=>events.push('navigated:'+frame.url().split('?')[0]));
    const login=await readFile('tests/fixtures/registration-login.html','utf8');
    let routed=0;
    await this.remote.context().route('https://unitreg.utar.edu.my/**',route=>{++routed;events.push('route:'+route.request().resourceType()+':'+route.request().url().split('?')[0]);return route.fulfill({contentType:'text/html',body:login});});
    // The native view starts its first request before CDP can attach. Cancel
    // that uncontrolled request and establish the fixture before testing Reload.
    const session=await this.remote.context().newCDPSession(this.remote);await session.send('Page.stopLoading');await session.detach();
    await this.remote.goto('https://unitreg.utar.edu.my/portal/courseRegStu/login.jsp?ttap-fixture=1');
    await expect(this.remote).toHaveTitle('UTAR login test fixture');
    await this.page.getByRole('button',{name:'Reload',exact:true}).click();
    try{await expect.poll(()=>this.page.evaluate(()=>window.ttap!.getRegistrationStatus())).toMatchObject({loading:false,error:''});}
    catch(error){console.log('Native login diagnostic',JSON.stringify({routed,events,pages:this.connections.flatMap(browser=>browser.contexts().flatMap(context=>context.pages().map(page=>page.url().split('?')[0]))),document:await this.remote.evaluate(()=>({title:document.title,ready:document.readyState,passwords:document.querySelectorAll('input[type=password]').length,probe:!!Reflect.get(window,'__ttapRegistration'),resources:performance.getEntriesByType('resource').map(e=>e.name.split('?')[0])}))}));throw error;}
    await expect(this.remote).toHaveTitle('UTAR login test fixture');expect(routed).toBeGreaterThan(0);
    await expect(this.remote.getByLabel('Password')).toBeVisible();
  }
  async stop(){
    for(const browser of this.connections)await browser.close().catch(()=>{});
    if(this.process?.exitCode===null){this.process.kill();await new Promise<void>(done=>{this.process.once('exit',()=>done());setTimeout(done,5000).unref();});}
  }
}
