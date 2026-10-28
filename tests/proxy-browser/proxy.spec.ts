import {test,expect,type Page} from '@playwright/test';
let visitor=1;
test.beforeEach(async({page})=>{await page.setExtraHTTPHeaders({'x-forwarded-for':`198.51.100.${visitor++}`});await page.goto('/');await page.getByRole('button',{name:'Skip tutorial'}).click();});
const frame=(page:Page)=>page.frameLocator('iframe[title="UTAR Course Registration System"]');
async function login(page:Page,code='synthetic-code'){
  const f=frame(page);await f.getByLabel('Student ID').fill('synthetic-user');await f.getByLabel('Password').fill('synthetic-password');await f.getByLabel('Verification code').fill(code);await f.getByRole('button',{name:'Login',exact:true}).click();
}
async function schedule(page:Page){await login(page);await frame(page).getByRole('link',{name:'Course Timetable Preview'}).click();await expect(page.getByRole('button',{name:'Preview courses from this page'})).toBeEnabled();}
test('synthetic login retry, safe legacy HTTP redirect, current preview, plan and image export',async({page},info)=>{
  const replies:unknown[]=[];await page.exposeFunction('collectProxyMessage',(value:unknown)=>replies.push(value));await page.evaluate(()=>addEventListener('message',event=>{if(event.data?.channel==='ttap-registration-v1')void (window as unknown as {collectProxyMessage:(data:unknown)=>Promise<void>}).collectProxyMessage(event.data);}));
  await expect(frame(page).getByLabel('Password')).toBeInViewport();await login(page,'wrong');await expect(page.getByRole('alert')).toContainText('verification code');await login(page);
  await expect(frame(page).getByText('Synthetic account marker')).toBeVisible();await frame(page).getByRole('link',{name:'Course Timetable Preview'}).click();await expect(page.getByRole('button',{name:'Preview courses from this page'})).toBeEnabled();
  expect(replies.some(value=>JSON.stringify(value).includes('TEST2013'))).toBe(false);await page.getByRole('button',{name:'Preview courses from this page'}).click();await expect(page.getByRole('dialog',{name:'Add slots manually'})).toBeVisible();
  await expect(page.getByText('2 courses',{exact:true})).toBeVisible();await expect(page.getByText('4 classes found',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Use these courses'}).click();await page.getByRole('checkbox',{name:/^TEST2013 /}).check();await expect(page.getByText('Option 1 of 1')).toBeVisible();
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export image'}).click();expect((await download).suggestedFilename()).toMatch(/\.png$/);await page.getByRole('button',{name:'I kept the file'}).click();
  expect(JSON.stringify(replies)).not.toMatch(/synthetic-password|synthetic-user|synthetic-owned-|UPSTREAM|passid|Synthetic account marker/);expect(await page.evaluate(()=>!!window.ttap)).toBe(false);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:info.outputPath('proxy-imported.png')});
});
test('cancelled validation and same-document anchors do not strand Preview; Reload discards old replies',async({page})=>{
  await schedule(page);await frame(page).getByRole('button',{name:'Cancelled action'}).click();await expect(page.getByRole('button',{name:'Preview courses from this page'})).toBeEnabled();await frame(page).getByRole('link',{name:'Same page'}).click();await expect(page.getByRole('button',{name:'Preview courses from this page'})).toBeEnabled();
  const f=page.frames().find(item=>item.url().includes('masterScheduleSurvey.jsp'))!;
  // Hold a real request, reload the same URL/WindowProxy, then replay its old IDs.
  await page.addInitScript(()=>{addEventListener('message',event=>{if(event.data?.type==='preview'){Reflect.set(window,'held',event.data);event.stopImmediatePropagation();}},true);});await f.evaluate(()=>location.reload());await expect(page.getByRole('button',{name:'Preview courses from this page'})).toBeEnabled();
  await page.getByRole('button',{name:'Preview courses from this page'}).click();await expect.poll(()=>f.evaluate(()=>!!Reflect.get(window,'held'))).toBe(true);const held=await f.evaluate(()=>Reflect.get(window,'held'));
  await f.evaluate(()=>location.reload());await expect(page.getByRole('button',{name:'Preview courses from this page'})).toBeEnabled();await f.evaluate(data=>parent.postMessage({...data,type:'preview',source:{name:'UTAR course schedule',text:'<table><tr><td>stale-canary</td></tr></table>'}},'http://127.0.0.1:4177'),held);await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'Reload',exact:true}).click();await expect(frame(page).getByLabel('Password')).toBeVisible();
});
test('isolates two sessions, invalidates tokens after logout and expiry, and keeps the viewport bounded',async({page,browser},info)=>{
  await schedule(page);const a=page.frames().find(item=>item.url().includes('masterScheduleSurvey.jsp'))!,owned=a.url();const other=await browser.newContext({extraHTTPHeaders:{'x-forwarded-for':'198.51.100.240'}}),b=await other.newPage();try{
    await b.goto('/');await b.getByRole('button',{name:'Skip tutorial'}).click();await expect(frame(b).getByLabel('Password')).toBeVisible();const foreign=await other.request.get(owned,{maxRedirects:0});expect(foreign.status()).toBe(403);
    for(const width of [1024,375,320]){await page.setViewportSize({width,height:667});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);}await page.setViewportSize({width:1280,height:720});await page.screenshot({path:info.outputPath('proxy-course-preview.png')});
    await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(frame(page).getByLabel('Password')).toBeVisible();expect((await page.request.get(owned,{maxRedirects:0,headers:{'x-forwarded-for':'198.51.100.241'}})).status()).toBe(403);
    await schedule(page);await page.request.post('/__fixture/expire',{headers:{origin:'http://127.0.0.1:4177'}});await frame(page).getByRole('link',{name:'Refresh preview'}).click();await expect(page.getByRole('alert')).toContainText('expired');
  }finally{await other.close();}
});
test('does not claim logout when its local POST is rejected',async({page})=>{await schedule(page);await page.route('http://127.0.0.1:4187/__ttap/logout',route=>route.fulfill({status:403,body:'synthetic denial'}));await page.getByRole('button',{name:'Log out',exact:true}).click();await expect(page.getByRole('alert')).toContainText('could not be closed');await expect(frame(page).getByText('Synthetic account marker')).toBeVisible();});
test('compact and full login views preserve the entered fields',async({page},info)=>{const f=frame(page);await f.getByLabel('Student ID').fill('synthetic-draft');await expect(f.locator('#fixture-banner')).toBeHidden();await page.getByRole('button',{name:'Show full page'}).click();await expect(f.locator('#fixture-banner')).toBeVisible();await expect(f.getByLabel('Student ID')).toHaveValue('synthetic-draft');await page.getByRole('button',{name:'Compact login'}).click();await expect(f.locator('#fixture-banner')).toBeHidden();await page.screenshot({path:info.outputPath('proxy-login.png')});});
