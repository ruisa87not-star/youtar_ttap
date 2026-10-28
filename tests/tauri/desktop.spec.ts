import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {TauriHarness} from './harness';
import {demo,configure,waitForTimetable,expectSchoolDayInViewport,importPlan,schoolDayProject,courseOrderingProject} from '../e2e/helpers';
const official='https://unitreg.utar.edu.my/portal/courseRegStu/';
let app:TauriHarness;
test.beforeEach(async()=>{app=new TauriHarness();await app.start();await app.skip();});
test.afterEach(async()=>{await app?.stop();});

test('course ordering moves clashes down and restores the catalog after Clear',async()=>{
  const {page}=app;await importPlan(page,courseOrderingProject());
  const codes=()=>page.getByRole('checkbox').evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label')!.split(' ')[0]));
  const clash=page.getByRole('checkbox',{name:/^CLASH1001 /});await expect(clash).toBeDisabled();await expect(clash.locator('xpath=ancestor::article').locator('.course-clash')).toHaveText('Course Clash');
  await expect.poll(codes).toEqual(['DAY1001','FREE1001','CLASH1001']);await page.getByRole('button',{name:'Clear',exact:true}).click();
  await expect(clash).toBeEnabled();await expect.poll(codes).toEqual(['CLASH1001','DAY1001','FREE1001']);
  await clash.check();await expect.poll(codes).toEqual(['CLASH1001','FREE1001','DAY1001']);
});

test('legacy login redirect reaches HTTPS without making an HTTP request',async()=>{
  const {page,remote}=app;let insecureRequests=0;
  await remote.context().route('http://unitreg.utar.edu.my/**',route=>{insecureRequests++;return route.abort();});
  await remote.context().unroute('https://unitreg.utar.edu.my/**');
  await remote.context().route('https://unitreg.utar.edu.my/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/loginProSurvey.jsp'))return route.fulfill({status:302,headers:{location:'http://unitreg.utar.edu.my/portal/courseRegStu/indexSurvey.jsp?passid=synthetic%2Fonly'}});
    return route.fulfill({contentType:'text/html',body:url.pathname.endsWith('/indexSurvey.jsp')?'<h1>Secure survey fixture</h1>':'<form method="post" action="loginProSurvey.jsp"><button>Login fixture</button></form>'});
  });
  await page.getByRole('button',{name:'Reload',exact:true}).click();
  await remote.getByRole('button',{name:'Login fixture'}).click();
  await expect(remote).toHaveURL(official+'indexSurvey.jsp?passid=synthetic%2Fonly');
  await expect(remote.getByRole('heading',{name:'Secure survey fixture'})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>window.ttap!.getRegistrationStatus())).toMatchObject({loading:false,error:''});
  expect(insecureRequests).toBe(0);
});

test('native login is compact, isolated, and denied every application command',async()=>{
  const {page,remote}=app;
  expect(await page.evaluate(()=>({width:innerWidth,height:innerHeight}))).toMatchObject({width:expect.any(Number)});
  await expect(remote.locator('#university-banner')).toBeHidden();await expect(remote.locator('#unrelated-announcement')).toBeHidden();
  const bounds=await remote.evaluate(()=>({width:innerWidth,height:innerHeight}));expect(bounds.width).toBeLessThanOrEqual(896);expect(bounds.height).toBeLessThanOrEqual(340);
  expect(await remote.evaluate(()=>typeof window.ttap)).toBe('undefined');
  const denied=await remote.evaluate(async()=>{
    const internal=Reflect.get(window,'__TAURI_INTERNALS__') as {invoke:(name:string,args?:object)=>Promise<unknown>};
    if(!internal?.invoke)throw Error('The test must attempt the actual IPC transport.');
    const commands=['ttap_pick_html','ttap_open_project','ttap_export_project','ttap_export_image','ttap_open_registration','ttap_registration_bounds','ttap_registration_status','ttap_reload_registration','ttap_read_registration','ttap_set_dirty','ttap_acknowledge_close','ttap_confirm_close'];
    return Promise.all(commands.map(async name=>{try{await internal.invoke(name,{});return {name,denied:false};}catch(error){return {name,denied:String(error).includes('not allowed')};}}));
  });expect(denied.every(x=>x.denied),JSON.stringify(denied)).toBe(true);
  await remote.evaluate(()=>{const frame=document.createElement('iframe');frame.src='/portal/courseRegStu/frame-fixture';document.body.append(frame);});
  await expect.poll(()=>remote.frames().length).toBeGreaterThan(1);
  const child=remote.frames().find(frame=>frame.parentFrame()!==null)!;await child.waitForLoadState();
  expect(await child.evaluate(async()=>{const internal=Reflect.get(window,'__TAURI_INTERNALS__')??Reflect.get(parent,'__TAURI_INTERNALS__');try{await internal.invoke('ttap_pick_html');return false;}catch(error){return String(error).includes('not allowed');}})).toBe(true);
  await page.getByRole('button',{name:'Preview courses from this page'}).click();await expect(page.getByRole('alert')).toContainText('Login pages are not imported');
  await page.getByRole('button',{name:'Add slots manually'}).click();await expect(page.getByRole('dialog',{name:'Add slots manually'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
  await remote.evaluate(()=>{location.href='https://example.com/';});
  await expect.poll(()=>page.evaluate(()=>window.ttap!.getRegistrationStatus())).toMatchObject({error:expect.stringContaining('leave the UTAR')});expect(remote.url()).toContain('unitreg.utar.edu.my');
});

test('native registration reports HTTP, connection and login errors and only extracts the current course table',async()=>{
  const {page,remote}=app;const fixture=await readFile('tests/fixtures/student-lecturer.html','utf8');
  await remote.context().route('**/status-503',route=>route.fulfill({status:503,body:'Service unavailable'}));
  await remote.goto(official+'status-503');await expect.poll(()=>page.evaluate(()=>window.ttap!.getRegistrationStatus())).toMatchObject({loading:false,error:expect.stringContaining('503')});
  await remote.context().route('**/connection-error',route=>route.abort('connectionrefused'));await remote.goto(official+'connection-error').catch(()=>{});
  await expect.poll(()=>page.evaluate(()=>window.ttap!.getRegistrationStatus())).toMatchObject({loading:false,error:expect.stringContaining('WebView2 error')});
  await remote.context().route('**/login.jsp',route=>route.fulfill({body:'<!doctype html><form><input type="password"></form><p role="alert">Synthetic incorrect credentials</p>',contentType:'text/html'}));
  await page.getByRole('button',{name:'Reload',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Synthetic incorrect credentials');
  await remote.context().route('**/schedule/masterScheduleSurvey.jsp',route=>route.fulfill({body:'<header>synthetic-account-marker</header>'+fixture,contentType:'text/html'}));
  await remote.goto(official+'schedule/masterScheduleSurvey.jsp');await expect.poll(()=>page.evaluate(()=>window.ttap!.getRegistrationStatus())).toMatchObject({loading:false,error:''});
  const source=await page.evaluate(()=>window.ttap!.readRegistrationPage());expect(source.status).toBe('ok');if(source.status==='ok'){expect(source.value.text).toContain('overviewSector');expect(source.value.text).not.toContain('synthetic-account-marker');}
  await page.getByRole('button',{name:'Preview courses from this page'}).click();await expect(page.getByText('2 courses',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Use these courses'}).click();await expect(page.getByRole('checkbox')).toHaveCount(2);
  await page.getByRole('checkbox',{name:/^TEST2013 /}).check();await page.getByRole('checkbox',{name:/^TEST2023 /}).check();
  const timetable=page.getByRole('region',{name:'Weekly timetable'});await expect(timetable.getByRole('button',{name:/Lecture group 1, 10:00/})).toBeVisible();await expect(timetable.getByRole('button',{name:/Practical group 1, 16:00/})).toBeVisible();
});

test('Tauri retains demo, immediate timetable, groups, clash, clear and fixed time orientation',async()=>{
  const {page}=app;await demo(page);await configure(page);await waitForTimetable(page);
  await expect(page.getByRole('button',{name:'Generate',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Export image',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Clear',exact:true}).click();await expect(page.getByRole('checkbox',{checked:true})).toHaveCount(0);
  await importPlan(page,schoolDayProject());await expectSchoolDayInViewport(page);
  await page.getByLabel('From',{exact:true}).fill('06:00');await page.getByLabel('Until',{exact:true}).fill('07:00');await page.getByRole('button',{name:'Add unavailable time'}).click();await expect(page.locator('.time-axis').getByLabel('06:00',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
});

test('a native read pending during same-URL reload rejects the old table before import',async()=>{
  const {page,remote}=app;const schedule=official+'schedule/masterSchedule.jsp';
  const html=await readFile('tests/fixtures/student-v2.html','utf8');
  await remote.context().route(schedule,route=>route.fulfill({body:html,contentType:'text/html'}));
  await remote.goto(schedule);await expect.poll(()=>page.evaluate(()=>window.ttap!.getRegistrationStatus())).toMatchObject({loading:false,error:''});
  await remote.context().unroute(schedule);
  let release!:()=>void;const responseGate=new Promise<void>(resolve=>{release=resolve;});
  let requested!:()=>void;const requestStarted=new Promise<void>(resolve=>{requested=resolve;});
  await remote.context().route(schedule,async route=>{requested();await responseGate;await route.fulfill({body:html,contentType:'text/html'});});
  const session=await remote.context().newCDPSession(remote);await session.send('Debugger.enable');
  let resumed=false;session.on('Debugger.resumed',()=>{resumed=true;});
  const {result:reader}=await session.send('Runtime.evaluate',{expression:'window.__ttapRegistration.read'});
  expect(reader.type).toBe('function');expect(reader.objectId).toBeTruthy();
  await session.send('Debugger.setBreakpointOnFunctionCall',{objectId:reader.objectId!});
  const paused=new Promise<void>(resolve=>{session.once('Debugger.paused',()=>resolve());});
  let reload:Promise<unknown>|undefined;
  try{
    await page.getByRole('button',{name:'Preview courses from this page'}).click();await paused;
    await expect(page.getByRole('button',{name:'Reading page…'})).toBeVisible();
    reload=remote.reload({waitUntil:'domcontentloaded'});await requestStarted;
    // The new response stays held, so the old DOM still exists. URL comparison
    // alone cannot catch this same-URL reload: native navigation state must change.
    expect(remote.url()).toBe(schedule);
    await expect.poll(()=>page.evaluate(()=>window.ttap!.getRegistrationStatus())).toMatchObject({loading:true,error:''});
    // WebView2 can resume the old script automatically when reload begins.
    if(!resumed)await session.send('Debugger.resume').catch(error=>{if(!resumed)throw error;});
    await expect(page.getByRole('alert')).toHaveText('The page changed. Open the timetable preview and try again.');
    await expect(page.getByRole('dialog',{name:'Add slots manually'})).toHaveCount(0);
    await expect(page.getByRole('button',{name:'Preview courses from this page'})).toBeEnabled();
  }finally{release();await session.send('Debugger.resume').catch(()=>{});await reload?.catch(()=>{});await session.detach();}
  await expect.poll(()=>page.evaluate(()=>window.ttap!.getRegistrationStatus())).toMatchObject({loading:false,error:''});
  await page.getByRole('button',{name:'Preview courses from this page'}).click();await expect(page.getByText('2 courses',{exact:true})).toBeVisible();
});
