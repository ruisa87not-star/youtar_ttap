import {test,expect,_electron,type ElectronApplication} from '@playwright/test';
import {resolve} from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {demo,configure,waitForTimetable,downloadImage,expectPrimaryActionInViewport,importPlan,schoolDayProject,expectSchoolDayInViewport,courseOrderingProject} from './helpers';
let app:ElectronApplication;
const {version}=JSON.parse(await readFile(new URL('../../package.json',import.meta.url),'utf8')) as {version:string};
test.beforeEach(async()=>{
  app=await _electron.launch({executablePath:resolve('release/win-unpacked/youtar_ttap.exe')});
  await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isMaximized())).toBe(true);
  const login=await readFile('tests/fixtures/registration-login.html','utf8');
  await app.evaluate(({session},html)=>{session.fromPartition('ttap-registration').protocol.handle('https',()=>new Response(html,{headers:{'content-type':'text/html'}}));},login);
  const page=await app.firstWindow();await page.getByRole('button',{name:'Skip tutorial'}).click();
});
test.afterEach(async()=>{if(app){await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.destroy())).catch(()=>{});await app.close();}});

test('course ordering moves clashes down and restores the catalog after Clear',async()=>{
  const page=await app.firstWindow();await importPlan(page,courseOrderingProject());
  const codes=()=>page.getByRole('checkbox').evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label')!.split(' ')[0]));
  const clash=page.getByRole('checkbox',{name:/^CLASH1001 /});await expect(clash).toBeDisabled();await expect(clash.locator('xpath=ancestor::article').locator('.course-clash')).toHaveText('Course Clash');
  await expect.poll(codes).toEqual(['DAY1001','FREE1001','CLASH1001']);await page.getByRole('button',{name:'Clear',exact:true}).click();
  await expect(clash).toBeEnabled();await expect.poll(codes).toEqual(['CLASH1001','DAY1001','FREE1001']);
  await clash.check();await expect.poll(codes).toEqual(['CLASH1001','FREE1001','DAY1001']);
});

test('legacy login redirect reaches HTTPS without making an HTTP request',async()=>{
  const page=await app.firstWindow();
  await app.evaluate(({session})=>{
    const protocol=session.fromPartition('ttap-registration').protocol;protocol.unhandle('https');
    Reflect.set(globalThis,'__ttapInsecureRequests',0);
    protocol.handle('http',()=>{Reflect.set(globalThis,'__ttapInsecureRequests',Number(Reflect.get(globalThis,'__ttapInsecureRequests'))+1);return new Response('Unexpected HTTP',{status:500});});
    protocol.handle('https',request=>{
      const url=new URL(request.url);
      if(url.pathname.endsWith('/loginProSurvey.jsp'))return new Response(null,{status:302,headers:{location:'http://unitreg.utar.edu.my/portal/courseRegStu/indexSurvey.jsp?passid=synthetic%2Fonly'}});
      return new Response(url.pathname.endsWith('/indexSurvey.jsp')?'<h1>Secure survey fixture</h1>':'<form method="post" action="loginProSurvey.jsp"><button>Login fixture</button></form>',{headers:{'content-type':'text/html'}});
    });
  });
  await page.getByRole('button',{name:'Reload',exact:true}).click();
  await expect.poll(()=>app.evaluate(async({webContents})=>{
    const wc=webContents.getAllWebContents().find(w=>w.getURL().includes('unitreg.utar.edu.my'))!;
    if(!wc)return false;
    return wc.executeJavaScript("!!document.querySelector('button')").catch(()=>false);
  })).toBe(true);
  await app.evaluate(async({webContents})=>{const wc=webContents.getAllWebContents().find(w=>w.getURL().includes('unitreg.utar.edu.my'))!;await wc.executeJavaScript("document.querySelector('button').click()");});
  await expect.poll(()=>app.evaluate(({webContents})=>webContents.getAllWebContents().some(w=>w.getURL()==='https://unitreg.utar.edu.my/portal/courseRegStu/indexSurvey.jsp?passid=synthetic%2Fonly'))).toBe(true);
  await expect.poll(()=>page.evaluate(()=>window.ttap!.getRegistrationStatus())).toMatchObject({loading:false,error:''});
  expect(await app.evaluate(()=>Reflect.get(globalThis,'__ttapInsecureRequests'))).toBe(0);
});

test('packaged release fits weekday rows and horizontal 08:00–18:00',async({browserName: _browserName},info)=>{
  const page=await app.firstWindow();await expect(page.getByText(`v${version}`,{exact:true})).toBeVisible();await expect(page).toHaveTitle(`youtar_ttap ${version}`);
  expect(await app.evaluate(({app})=>app.getVersion())).toBe(version);
  expect(await page.locator('.brand-mark').evaluate(image=>(image as HTMLImageElement).naturalWidth>0)).toBe(true);
  expect(await page.evaluate(async()=>{const href=document.querySelector<HTMLLinkElement>('link[rel=icon]')!.href;return (await fetch(href)).ok;})).toBe(true);
  await importPlan(page,schoolDayProject());await expect(page.getByText('Option 1 of 1')).toBeVisible();
  for(const size of [[1280,720],[1024,600]]){
    await app.evaluate(({BrowserWindow},[width,height])=>{const win=BrowserWindow.getAllWindows()[0];win.unmaximize();win.setContentSize(width,height);},size);await expectSchoolDayInViewport(page);
    await page.screenshot({path:info.outputPath(`school-day-native-${size[0]}.png`)});
  }
});

test('official login, manual guide and reversible navigation work in the packaged app',async({browserName: _browserName},info)=>{
  const page=await app.firstWindow();const html=await readFile('tests/fixtures/student-v2.html','utf8');
  const login=await readFile('tests/fixtures/registration-login.html','utf8');
  await app.evaluate(({session},{html,login})=>{const protocol=session.fromPartition('ttap-registration').protocol;protocol.unhandle('https');protocol.handle('https',request=>new Response(['/portal/courseRegStu/schedule/masterSchedule.jsp','/portal/courseRegStu/schedule/masterScheduleSurvey.jsp'].includes(new URL(request.url).pathname)?(Reflect.get(globalThis,'__ttapExpiredFixture')?'<!doctype html><form><input type="password" value="synthetic-only"></form>':'<p>synthetic-account-marker</p>'+html):login,{headers:{'content-type':'text/html'}}));},{html,login});
  await page.getByRole('button',{name:'Reload',exact:true}).click();await expect(page.getByRole('heading',{name:'Course Registration System',exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Open Course Registration System'})).toHaveCount(0);
  await expect.poll(()=>app.evaluate(({webContents})=>webContents.getAllWebContents().some(w=>w.getURL()==='https://unitreg.utar.edu.my/portal/courseRegStu/login.jsp'))).toBe(true);
  for(const size of [[1280,720],[800,600]]){
    await app.evaluate(({BrowserWindow},size)=>{const win=BrowserWindow.getAllWindows()[0];win.unmaximize();win.setSize(size[0],size[1]);},size);
    await expect.poll(()=>app.evaluate(({BrowserWindow,WebContentsView})=>{const win=BrowserWindow.getAllWindows()[0],view=win.contentView.children.find(v=>v instanceof WebContentsView&&(v as Electron.WebContentsView).webContents.getURL().includes('unitreg.utar.edu.my')) as Electron.WebContentsView;const bounds=view.getBounds(),[width,height]=win.getContentSize();return view.getVisible()&&bounds.y>=48&&bounds.width<=896&&bounds.height<=340&&bounds.x+bounds.width<=width&&bounds.y+bounds.height<=height;})).toBe(true);
  }
  await expect.poll(()=>app.evaluate(async({webContents})=>{const wc=webContents.getAllWebContents().find(w=>w.getURL().includes('unitreg.utar.edu.my'))!;return wc.executeJavaScript("getComputedStyle(document.querySelector('#university-banner')).display==='none' && getComputedStyle(document.querySelector('#unrelated-announcement')).display==='none' && document.querySelector('input[type=password]').getBoundingClientRect().width>0");})).toBe(true);
  const capture=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].capturePage()).toPNG().toString('base64'));await writeFile(info.outputPath('integrated-login-fixture.png'),Buffer.from(capture,'base64'));
  const isolation=await app.evaluate(({webContents})=>{const w=webContents.getAllWebContents().find(w=>w.getURL().includes('unitreg.utar.edu.my'))! as Electron.WebContents&{getLastWebPreferences:()=>Electron.WebPreferences};const p=w.getLastWebPreferences();return {sandbox:p.sandbox,contextIsolation:p.contextIsolation,nodeIntegration:p.nodeIntegration,webSecurity:p.webSecurity,preload:p.preload};});expect(isolation).toMatchObject({sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true});expect(isolation.preload).toBeUndefined();
  await page.getByRole('button',{name:'Preview courses from this page'}).click();await expect(page.getByRole('alert')).toContainText('Login pages are not imported');
  await app.evaluate(async({webContents})=>{Reflect.set(globalThis,'__ttapExpiredFixture',true);const w=webContents.getAllWebContents().find(w=>w.getURL().includes('unitreg.utar.edu.my'))!;await w.loadURL('https://unitreg.utar.edu.my/portal/courseRegStu/schedule/masterSchedule.jsp');});
  await page.getByRole('button',{name:'Preview courses from this page'}).click();await expect(page.getByRole('alert')).toContainText('login form');
  await app.evaluate(async({webContents})=>{Reflect.set(globalThis,'__ttapExpiredFixture',false);const w=webContents.getAllWebContents().find(w=>w.getURL().includes('unitreg.utar.edu.my'))!;await w.loadURL('https://unitreg.utar.edu.my/portal/courseRegStu/schedule/masterScheduleSurvey.jsp');});
  const source=await page.evaluate(()=>window.ttap!.readRegistrationPage());expect(source.status).toBe('ok');if(source.status==='ok'){expect(source.value.text).toContain('overviewSector');expect(source.value.text).not.toContain('synthetic-account-marker');}
  await page.getByRole('button',{name:'Preview courses from this page'}).click();await expect(page.getByText('2 courses',{exact:true})).toBeVisible();
  expect(await app.evaluate(({BrowserWindow,WebContentsView})=>BrowserWindow.getAllWindows()[0].contentView.children.filter(v=>v instanceof WebContentsView).every(v=>!v.getVisible()))).toBe(true);
  await page.getByRole('button',{name:'Cancel import'}).click();
  await expect(page.getByRole('region',{name:'Manual slot import guide'})).toContainText('Ctrl + U');await page.mouse.click(4,4);await expect(page.getByRole('dialog',{name:'Add slots manually'})).toHaveCount(0);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(1280,720));await demo(page);await waitForTimetable(page);await page.getByRole('button',{name:'Collapse course sidebar'}).click();await expect(page.getByRole('button',{name:'Expand course sidebar'})).toHaveAttribute('aria-expanded','false');
  await page.screenshot({path:info.outputPath('desktop-expanded.png')});await page.getByRole('button',{name:'Go back'}).click();await page.getByRole('button',{name:'Back to planner'}).click();await expect(page.getByText('Option 1 of 2')).toBeVisible();
  await page.getByRole('button',{name:'Expand course sidebar'}).click();await expect(page.getByRole('checkbox',{name:/^TEST1013 /})).toBeChecked();await page.getByRole('button',{name:'Tutorial',exact:true}).click();await page.getByRole('button',{name:'Skip tutorial'}).click();await expect(page.getByText('Option 1 of 2')).toBeVisible();
});
test('primary action remains visible in a compact Windows window',async()=>{
  expect(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].isMaximized())).toBe(true);
  await app.evaluate(({BrowserWindow})=>{const win=BrowserWindow.getAllWindows()[0];win.unmaximize();win.setSize(1280,720);});const page=await app.firstWindow();await demo(page);
  await page.getByRole('link',{name:'youtar_ttap UTAR timetable planner',exact:true}).scrollIntoViewIfNeeded();await expectPrimaryActionInViewport(page);
});
for(const sample of [{name:'archived spanned-Remark',file:'student-td-mode.html',code:'TEST1013',count:1},{name:'current Lecturer/Tutor',file:'student-lecturer.html',code:'TEST2013',count:2}])test(`native HTML import preserves the ${sample.name} layout`,async()=>{
  const page=await app.firstWindow();await app.evaluate(({dialog},path)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[path]});},resolve('tests/fixtures/'+sample.file));
  await page.getByRole('button',{name:'Add slots manually'}).click();await page.getByRole('button',{name:'Choose HTML files'}).click();await expect(page.getByText(`${sample.count} courses`,{exact:true})).toBeVisible();await page.getByRole('button',{name:'Use these courses'}).click();await page.getByRole('checkbox',{name:new RegExp('^'+sample.code+' ')}).check();
  await expect(page.getByText('Option 1 of 1')).toBeVisible();const timetable=page.getByRole('region',{name:'Weekly timetable'});await expect(timetable.getByRole('button',{name:/Lecture group 1, 09:00/})).toBeVisible();await expect(timetable.getByRole('button',{name:/Lecture group 1, 10:00/})).toBeVisible();
  if(sample.count===2){await page.getByRole('checkbox',{name:/^TEST2023 /}).check();await expect(timetable.getByRole('button',{name:/Practical group 1, 15:00/})).toBeVisible();await expect(timetable.getByRole('button',{name:/Practical group 1, 16:00/})).toBeVisible();}
});
test('web and native export real registration images and preserve cancellation protection',async({page},info)=>{
  await page.goto('/');await page.getByRole('button',{name:'Skip tutorial'}).click();await demo(page);await configure(page);
  await downloadImage(page,info.outputPath('from-web.png'));
  const desktop=await app.firstWindow();await demo(desktop);await configure(desktop);await expect(desktop.getByText('Option 1 of 2')).toBeVisible();
  const nativePath=info.outputPath('from-desktop.png');await app.evaluate(({dialog},filePath)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath});},nativePath);
  await desktop.getByRole('button',{name:'Export image'}).click();await expect(desktop.getByText('Saved from-desktop.png.')).toBeVisible();
  const image=await app.evaluate(({nativeImage},path)=>{const image=nativeImage.createFromPath(path);return {empty:image.isEmpty(),size:image.getSize()};},nativePath);
  expect(image.empty).toBe(false);expect(image.size.width).toBe(1600);expect(image.size.height).toBeGreaterThan(1000);
  await desktop.getByRole('button',{name:'Next timetable'}).click();await expect(desktop.getByText('Image not exported',{exact:true})).toBeVisible();
  await desktop.screenshot({path:info.outputPath('desktop.png')});
});

test('packaged importer cannot execute HTML or fetch its resources, and protocol rejects other files',async({browserName: _browserName},info)=>{
  const page=await app.firstWindow();let probes=0;page.on('request',r=>{if(r.url().includes('import-probe'))probes++;});
  const path=info.outputPath('untrusted.html');const html=await readFile('tests/fixtures/student-v2.html','utf8');
  await writeFile(path,html+`<script>window.__importExecuted=true;fetch('https://example.com/import-probe-script')</script><img src="https://example.com/import-probe-image"><iframe src="https://example.com/import-probe-frame"></iframe>`);
  await app.evaluate(({dialog},filePath)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[filePath]});},path);
  await page.getByRole('button',{name:'Add slots manually'}).click();await page.getByRole('button',{name:'Choose HTML files'}).click();await expect(page.getByText('2 courses',{exact:true})).toBeVisible();expect(await page.evaluate(()=>Reflect.get(window,'__importExecuted'))).toBeUndefined();expect(probes).toBe(0);
  expect(await app.evaluate(async({net})=>{const response=await net.fetch('ttap://app/main/index.js');return response.status;})).toBe(404);
});
test('packaged demo, native HTML picker and cancelled save preserve dirty-close protection',async()=>{
  const page=await app.firstWindow();const paths=[resolve('tests/fixtures/student-v2.html'),resolve('tests/fixtures/paginated.html')];
  await app.evaluate(({dialog},filePaths)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths});dialog.showSaveDialog=async()=>({canceled:true,filePath:''});},paths);
  await page.getByRole('button',{name:'Add slots manually'}).click();await page.getByRole('button',{name:'Choose HTML files'}).click();await expect(page.getByText('2 courses',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Use these courses'}).click();await page.getByRole('checkbox',{name:/^TEST1013 /}).check();
  await expect(page.getByRole('region',{name:'Weekly timetable'})).toContainText('TEST1013');
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].close());await page.getByRole('button',{name:'Export and continue'}).click();await expect(page.getByRole('dialog',{name:'Keep your changes?'})).toBeVisible();await page.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByText('Image not exported')).toBeVisible();
  const prefs=await app.evaluate(({BrowserWindow})=>{const wc=BrowserWindow.getAllWindows()[0].webContents as Electron.WebContents&{getLastWebPreferences:()=>Electron.WebPreferences};const p=wc.getLastWebPreferences();return {sandbox:p.sandbox,contextIsolation:p.contextIsolation,nodeIntegration:p.nodeIntegration,webSecurity:p.webSecurity};});expect(prefs).toEqual({sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true});
  expect(await page.evaluate(()=>({require:typeof Reflect.get(window,'require'),process:typeof Reflect.get(window,'process'),bridge:Object.keys(window.ttap??{}).sort()}))).toEqual({require:'undefined',process:'undefined',bridge:['confirmClose','exportImage','exportProject','getRegistrationStatus','onCloseRequested','openProject','openRegistration','pickHtml','readRegistrationPage','reloadRegistration','setDirty','setRegistrationBounds']});
});

test('native login errors remain visible while connection failures report the actual problem',async({browserName: _browserName},info)=>{
  const page=await app.firstWindow();const login=await readFile('tests/fixtures/registration-login.html','utf8');
  await app.evaluate(({session},html)=>{const protocol=session.fromPartition('ttap-registration').protocol;protocol.unhandle('https');protocol.handle('https',()=>new Response(html+'<div class="error" role="alert">Invalid verification code. Please try again.</div>',{headers:{'content-type':'text/html'}}));},login);
  await page.getByRole('button',{name:'Reload',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Invalid verification code');
  const state=await app.evaluate(async({BrowserWindow,WebContentsView})=>{const view=BrowserWindow.getAllWindows()[0].contentView.children.find(v=>v instanceof WebContentsView) as Electron.WebContentsView;return {visible:view.getVisible(),form:await view.webContents.executeJavaScript("document.querySelector('input[type=password]').getBoundingClientRect().width>0 && getComputedStyle(document.querySelector('[role=alert]')).display!=='none'")};});expect(state).toEqual({visible:true,form:true});
  const capture=await app.evaluate(async({BrowserWindow,WebContentsView})=>{const view=BrowserWindow.getAllWindows()[0].contentView.children.find(v=>v instanceof WebContentsView) as Electron.WebContentsView;return (await view.webContents.capturePage()).toPNG().toString('base64');});await writeFile(info.outputPath('login-error.png'),Buffer.from(capture,'base64'));
  await app.evaluate(({session})=>{const protocol=session.fromPartition('ttap-registration').protocol;protocol.unhandle('https');protocol.handle('https',()=>new Response('Maintenance',{status:503,statusText:'Service Unavailable'}));});
  await page.getByRole('button',{name:'Reload',exact:true}).click();await expect(page.getByRole('alert')).toContainText('HTTP 503');await expect(page.getByRole('button',{name:'Reload',exact:true})).toBeEnabled();
});
