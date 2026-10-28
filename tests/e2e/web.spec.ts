import {test,expect} from '@playwright/test';
import {readFile,writeFile} from 'node:fs/promises';
import {demo,configure,waitForTimetable,downloadImage,importFixturePlan,importPlan,expectPrimaryActionInViewport,schoolDayProject,expectSchoolDayInViewport,courseOrderingProject} from './helpers';

test.beforeEach(async({page})=>{const login=await readFile('tests/fixtures/registration-web-login.html','utf8');await page.route('https://unitreg.utar.edu.my/**',route=>route.fulfill({contentType:'text/html',body:login}));await page.goto('/');await page.getByRole('button',{name:'Skip tutorial'}).click();});

test('Monday–Sunday rows and horizontal 08:00–18:00 fit after resizing',async({page},info)=>{
  const path=info.outputPath('school-day.ttap.json');await writeFile(path,JSON.stringify(schoolDayProject()));await importFixturePlan(page,path);
  await expect(page.getByText('Option 1 of 1')).toBeVisible();
  for(const size of [{width:1280,height:720},{width:1024,height:600},{width:375,height:667},{width:320,height:667}]){
    await page.setViewportSize(size);await expectSchoolDayInViewport(page);await page.screenshot({path:info.outputPath(`school-day-${size.width}.png`)});
  }
  await page.getByRole('region',{name:'Friday',exact:true}).getByRole('button').click();await expect(page.locator('.class-details').getByText('Full school day',{exact:true})).toBeVisible();await expectSchoolDayInViewport(page);await page.getByRole('button',{name:'Close details'}).click();await expectSchoolDayInViewport(page);
  await page.setViewportSize({width:1024,height:600});
  const extended=schoolDayProject();extended.courses[0].classes[0].meetings=[{day:6,startMinute:1080,endMinute:1200,weeks:[1],room:'Evening room'}];extended.selection.blocked=[{day:7,startMinute:420,endMinute:540}];
  const extendedPath=info.outputPath('weekend-evening.ttap.json');await writeFile(extendedPath,JSON.stringify(extended));await importFixturePlan(page,extendedPath);await expect(page.getByText('Option 1 of 1')).toBeVisible();
  await expect(page.getByRole('region',{name:'Saturday',exact:true}).getByRole('button',{name:/18:00 to 20:00/})).toBeInViewport();
  await expect(page.getByRole('region',{name:'Sunday',exact:true}).getByText('Unavailable')).toBeInViewport();
  await expect(page.locator('.time-axis').getByLabel('07:00',{exact:true})).toHaveCount(0);await expect(page.locator('.time-axis').getByLabel('08:00',{exact:true})).toBeInViewport();await expect(page.locator('.time-axis').getByLabel('20:00',{exact:true})).toBeInViewport();
  expect(await page.locator('.calendar-scroll').evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
  await page.screenshot({path:info.outputPath('weekend-evening.png')});
});

test('skip directly reveals a compact embedded registration and a dismissible manual dialog',async({page},info)=>{
  await expect(page.getByRole('region',{name:'Integrated course registration'})).toBeVisible();await expect(page.getByRole('link',{name:'Open Course Registration System'})).toHaveCount(0);
  await expect(page.frameLocator('iframe[title="UTAR Course Registration System"]').getByLabel('Password')).toBeInViewport();
  const box=await page.locator('.registration-web-viewport').boundingBox();expect(box!.width).toBeLessThanOrEqual(896);expect(box!.height).toBeLessThanOrEqual(340);await page.screenshot({path:info.outputPath('registration-home.png')});
  await page.getByRole('button',{name:'Add slots manually'}).click();const dialog=page.getByRole('dialog',{name:'Add slots manually'});await expect(dialog).toBeVisible();
  await dialog.getByText('View step-by-step screenshots',{exact:true}).click();
  expect(await dialog.locator('.guide-images img').evaluateAll(images=>images.length===2&&images.every(image=>(image as HTMLImageElement).complete&&(image as HTMLImageElement).naturalWidth>0))).toBe(true);
  await page.screenshot({path:info.outputPath('illustrated-guide.png')});
  await page.getByRole('button',{name:'Paste HTML'}).click();await expect(dialog).toBeVisible();await page.mouse.click(4,4);await expect(dialog).toHaveCount(0);await expect(page.getByRole('button',{name:'Add slots manually'})).toBeFocused();
  await page.getByRole('button',{name:'Add slots manually'}).click();await page.keyboard.press('Escape');await expect(dialog).toHaveCount(0);
});

test('browser compact login hides the banner and announcements, keeps the real form and can reveal subsequent pages',async({page},info)=>{
  const html=await readFile('tests/fixtures/registration-web-login.html','utf8');await page.route('https://unitreg.utar.edu.my/**',route=>route.fulfill({contentType:'text/html',body:html}));await page.reload();await page.getByRole('button',{name:'Skip tutorial'}).click();
  await expect(page.getByRole('button',{name:'Show full page'})).toBeVisible();
  const frame=page.frameLocator('iframe[title="UTAR Course Registration System"]');
  for(const size of [{width:1280,height:720},{width:1024,height:600}]){
    await page.setViewportSize(size);const crop=await page.locator('.registration-web-crop').boundingBox();const banner=await frame.locator('#university-banner').boundingBox(),form=await frame.locator('form table').boundingBox(),clock=await frame.locator('#server-clock').boundingBox(),announcement=await frame.locator('#unrelated-announcement').boundingBox();
    expect(banner!.y+banner!.height).toBeLessThanOrEqual(crop!.y);expect(form!.x).toBeGreaterThanOrEqual(crop!.x);expect(form!.x+form!.width).toBeLessThanOrEqual(crop!.x+crop!.width+1);expect(form!.y).toBeGreaterThanOrEqual(crop!.y);expect(clock!.y+clock!.height).toBeLessThanOrEqual(crop!.y+crop!.height);expect(announcement!.y).toBeGreaterThanOrEqual(crop!.y+crop!.height);
    const before=await frame.locator('body').evaluate(()=>scrollY);await page.mouse.move(form!.x+form!.width/2,form!.y+20);await page.mouse.wheel(0,800);expect(await frame.locator('body').evaluate(()=>scrollY)).toBe(before);
  }
  for(const width of [375,320]){
    await page.setViewportSize({width,height:667});await frame.getByLabel('Password').fill('synthetic-only');await expect(frame.getByLabel('Password')).toBeInViewport();
    const viewport=page.locator('.registration-web-viewport'),bounds=(await viewport.boundingBox())!,input=(await frame.getByLabel('Password').boundingBox())!;
    await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.wheel(Math.max(0,input.x+input.width-bounds.x-bounds.width+12),0);
    await expect.poll(async()=>{const input=(await frame.getByLabel('Password').boundingBox())!;return input.x>=bounds.x&&input.x+input.width<=bounds.x+bounds.width;}).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);await expect(page.getByRole('button',{name:'Show full page'})).toBeInViewport();
    await page.screenshot({path:info.outputPath(`web-compact-login-${width}.png`)});
  }
  await page.setViewportSize({width:1280,height:720});await frame.getByLabel('Student ID').fill('synthetic-only');
  await page.getByRole('button',{name:'Show full page'}).click();await expect(frame.getByLabel('Student ID')).toHaveValue('synthetic-only');await page.getByRole('button',{name:'Compact login'}).click();await expect(frame.getByLabel('Student ID')).toHaveValue('synthetic-only');
  await page.screenshot({path:info.outputPath('web-compact-login.png')});
  await page.route('https://unitreg.utar.edu.my/**/loginProSurvey.jsp',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><h1>Registration page fixture</h1><p role="alert">Synthetic login error remains visible.</p>'}));await frame.getByRole('button',{name:'Login',exact:true}).click();await expect(page.getByRole('button',{name:'Compact login'})).toBeVisible();await expect(frame.getByRole('heading',{name:'Registration page fixture'})).toBeInViewport();await expect(frame.getByRole('alert')).toBeInViewport();
  await page.getByRole('button',{name:'Reload',exact:true}).click();await expect(page.getByRole('button',{name:'Show full page'})).toBeVisible();await expect(frame.getByLabel('Student ID')).toHaveValue('');
});

test('demo opens a full catalog alongside the timetable, summary and visual constraints',async({page},info)=>{
  await page.setViewportSize({width:1280,height:720});await page.getByRole('button',{name:'Try demo'}).click();
  await expect(page.getByRole('checkbox')).toHaveCount(18);await expect(page.getByRole('region',{name:'Weekly timetable'})).toBeVisible();await expect(page.getByText('Sun',{exact:true})).toBeVisible();
  for(const code of ['MPU3143','MPU32013','MPU34072','UKMM1043'])await page.getByRole('checkbox',{name:new RegExp('^'+code+' ')}).check();
  await expect(page.getByText(/Option 1 of \d+/)).toBeVisible();await expect(page.getByRole('button',{name:'Next timetable'})).toBeEnabled();
  await page.getByRole('button',{name:'Show summary'}).click();await expect(page.getByRole('table',{name:'Course summary'})).toBeVisible();await expect(page.locator('.course-summary tfoot td')).toHaveText('11');
  expect.soft((await page.locator('.day-row').first().boundingBox())!.height).toBeGreaterThanOrEqual(24);
  await page.screenshot({path:info.outputPath('demo-summary.png')});await page.getByRole('button',{name:'Set time constraint'}).click();
  const dialog=page.getByRole('dialog',{name:'Set time constraint'});await dialog.getByRole('button',{name:'Sunday 17:30–18:00'}).click();await expect(dialog.getByRole('button',{name:'Sunday 17:30–18:00'})).toHaveAttribute('aria-pressed','true');
  expect.soft((await dialog.boundingBox())!.width).toBeGreaterThanOrEqual(1000);
  await page.screenshot({path:info.outputPath('demo-time-constraints.png')});await dialog.getByRole('button',{name:'Cancel',exact:true}).click();await expect(page.getByRole('button',{name:'Remove unavailable time 1'})).toHaveCount(0);
});

test('the app frame fits short screens while long sections scroll internally',async({page})=>{
  for(const viewport of [{width:1280,height:720},{width:1024,height:600},{width:375,height:667}]){
    await page.setViewportSize(viewport);await page.reload();
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('button',{name:'Skip tutorial'}).click();await page.getByRole('button',{name:'Add slots manually'}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:1280,height:720});await demo(page);
  await page.setViewportSize({width:375,height:667});await page.getByRole('button',{name:'Timetable',exact:true}).click();
  await expect(page.getByRole('region',{name:'Sunday',exact:true})).toBeVisible();
  await page.setViewportSize({width:1280,height:720});await waitForTimetable(page);
  const panel=await page.locator('.schedule-panel').boundingBox();expect(panel!.y+panel!.height).toBeLessThanOrEqual(720);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
});

test('desktop collapse preserves an active narrow Courses panel when resizing',async({page})=>{
  await demo(page);await page.setViewportSize({width:720,height:900});await page.getByRole('button',{name:'Courses',exact:true}).click();
  await page.setViewportSize({width:1280,height:720});const before=await page.getByRole('button',{name:'Collapse course sidebar'}).boundingBox();await page.getByRole('button',{name:'Collapse course sidebar'}).click();
  const after=await page.getByRole('button',{name:'Expand course sidebar'}).boundingBox();expect(after).toEqual(before);
  await page.setViewportSize({width:375,height:812});await expect(page.getByRole('button',{name:'Courses',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.getByRole('checkbox',{name:/^TEST1013 /})).toBeVisible();await expect(page.getByRole('checkbox',{name:/^TEST1013 /})).toBeChecked();
});

test('Clear removes filtered and fixed selections while full-day unavailable time keeps the 08:00–18:00 axis',async({page},info)=>{
  await page.setViewportSize({width:1280,height:720});await demo(page);await configure(page);
  await page.getByRole('combobox',{name:'Day',exact:true}).selectOption('7');await page.getByLabel('From',{exact:true}).fill('00:00');await page.getByLabel('Until',{exact:true}).fill('23:59');await page.getByRole('button',{name:'Add unavailable time'}).click();
  await expect(page.getByText('Option 1 of 2')).toBeVisible();
  expect(await page.locator('.time-axis time').evaluateAll(times=>times.map(time=>time.getAttribute('aria-label')))).toEqual(['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']);
  await expect(page.getByRole('region',{name:'Sunday',exact:true}).getByText('Unavailable')).toBeInViewport();
  expect(await page.locator('.brand-mark').evaluate(image=>(image as HTMLImageElement).naturalWidth>0)).toBe(true);
  expect((await page.request.get((await page.locator('link[rel=icon]').getAttribute('href'))!)).ok()).toBe(true);
  await page.screenshot({path:info.outputPath('planner-0.5.0.png')});
  await page.getByRole('searchbox',{name:'Search courses'}).fill('TEST1013');await page.getByRole('button',{name:'Clear',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search courses'}).fill('');await expect(page.getByRole('checkbox')).toHaveCount(18);await expect(page.getByRole('checkbox',{checked:true})).toHaveCount(0);
  await expect(page.getByRole('region',{name:'Weekly timetable'}).getByRole('button')).toHaveCount(0);await expect(page.getByRole('button',{name:'Export image'})).toBeDisabled();await expect(page.getByRole('button',{name:'Clear',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:/Remove unavailable time/})).toHaveCount(2);
  await page.getByRole('checkbox',{name:/^TEST1013 /}).check();await page.getByRole('button',{name:'Choose groups for TEST1013'}).click();await expect(page.getByLabel('Tutorial for TEST1013')).toHaveValue('');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true);
});

test('tutorial, manual import guide, sidebar and Back preserve the current plan',async({page},info)=>{
  await page.setViewportSize({width:1280,height:720});await page.reload();await expect(page.getByRole('heading',{name:'A quick tour of youtar_ttap.'})).toBeVisible();
  for(const width of [375,320]){
    await page.setViewportSize({width,height:900});await expect(page.getByRole('button',{name:'Skip tutorial'})).toBeInViewport();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:info.outputPath(`tutorial-${width}.png`)});
  }
  await page.setViewportSize({width:1280,height:720});
  await expect(page.getByRole('button',{name:'Previous step'})).toBeDisabled();await page.getByRole('button',{name:'Next step'}).click();await page.getByRole('button',{name:'Previous step'}).click();
  await page.screenshot({path:info.outputPath('tutorial.png')});await page.getByRole('button',{name:'Skip tutorial'}).click();
  await expect(page.getByRole('region',{name:'Integrated course registration'})).toBeVisible();
  await page.getByRole('button',{name:'Add slots manually'}).click();await expect(page.getByRole('region',{name:'Manual slot import guide'})).toContainText('Ctrl + U');
  await page.screenshot({path:info.outputPath('manual-guide.png'),fullPage:true});await page.keyboard.press('Escape');await demo(page);await waitForTimetable(page);
  const before=await page.locator('.schedule-panel').boundingBox();await page.getByRole('button',{name:'Collapse course sidebar'}).click();await expect(page.getByRole('checkbox',{name:/^TEST1013 /})).toHaveCount(0);
  const after=await page.locator('.schedule-panel').boundingBox();expect(after!.width).toBeGreaterThan(before!.width);
  await page.screenshot({path:info.outputPath('expanded-timetable.png')});
  await page.getByRole('button',{name:'Go back'}).click();await expect(page.getByRole('region',{name:'Integrated course registration'})).toBeVisible();await expect(page.getByRole('heading',{name:'Import courses.'})).toBeFocused();await page.getByRole('button',{name:'Back to planner'}).click();await expect(page.getByText('Option 1 of 2')).toBeVisible();
  await page.getByRole('button',{name:'Expand course sidebar'}).click();await expect(page.getByRole('checkbox',{name:/^TEST1013 /})).toBeChecked();await page.getByRole('button',{name:'Tutorial',exact:true}).click();await page.getByRole('button',{name:'Skip tutorial'}).click();await expect(page.getByText('Option 1 of 2')).toBeVisible();
});

test('primary timetable action stays in view on desktop and every narrow panel',async({page},info)=>{
  await page.setViewportSize({width:1280,height:720});await demo(page);
  await page.getByRole('link',{name:'youtar_ttap UTAR timetable planner'}).scrollIntoViewIfNeeded();await expectPrimaryActionInViewport(page);
  const schedule=await page.locator('.schedule-panel').boundingBox();expect(schedule!.y).toBeLessThan(240);
  await page.screenshot({path:info.outputPath('workbench-1280.png')});
  for(const width of [720,375,320]){
    await page.setViewportSize({width,height:900});await page.getByRole('link',{name:'youtar_ttap UTAR timetable planner'}).scrollIntoViewIfNeeded();
    for(const panel of ['Courses','Timetable','Conditions']){
      await page.getByRole('button',{name:panel,exact:true}).click();await expectPrimaryActionInViewport(page);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    }
    await page.getByRole('button',{name:'Timetable',exact:true}).click();await page.screenshot({path:info.outputPath(`workbench-${width}.png`)});
  }
});
test('course and timetable text remain readable at a laptop viewport',async({page},info)=>{
  await page.setViewportSize({width:1280,height:720});await demo(page);await waitForTimetable(page);
  expect(await page.locator('.course-name').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(14);
  expect(await page.locator('.meeting strong').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(12);
  expect(await page.locator('.meeting small').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(11);
  await page.screenshot({path:info.outputPath('workbench-generated.png')});
});

for(const sample of [{name:'archived td/Mode and spanned-Remark',file:'student-td-mode.html',code:'TEST1013',count:1},{name:'current Lecturer/Tutor and prerequisite-table',file:'student-lecturer.html',code:'TEST2013',count:2}])test(`imports the ${sample.name} layout with both meetings`,async({page},info)=>{
  await page.getByRole('button',{name:'Add slots manually'}).click();
  await page.getByRole('button',{name:'Paste HTML'}).click();await page.getByLabel('UTAR course HTML').fill(await readFile('tests/fixtures/'+sample.file,'utf8'));
  await page.getByRole('button',{name:'Preview import'}).click();await expect(page.getByText(`${sample.count} courses`,{exact:true})).toBeVisible();await page.getByRole('button',{name:'Use these courses'}).click();await page.getByRole('checkbox',{name:new RegExp('^'+sample.code+' ')}).check();
  await expect(page.getByText('Option 1 of 1')).toBeVisible();const timetable=page.getByRole('region',{name:'Weekly timetable'});await expect(timetable.getByRole('button',{name:/Lecture group 1, 09:00/})).toBeVisible();await expect(timetable.getByRole('button',{name:/Lecture group 1, 10:00/})).toBeVisible();
  if(sample.count===2){await page.getByRole('checkbox',{name:/^TEST2023 /}).check();await expect(timetable.getByRole('button',{name:/Practical group 1, 15:00/})).toBeVisible();await expect(timetable.getByRole('button',{name:/Practical group 1, 16:00/})).toBeVisible();await downloadImage(page,info.outputPath('lecturer-table.png'));}
});

test('course edits check clashes immediately and export the selected option as a PNG guide',async({page},info)=>{
  await demo(page);await configure(page);
  await expect(page.getByText('No clashes. Your selected courses fit together.')).toBeVisible();
  await expect(page.getByText('Option 1 of 2')).toBeVisible();
  await expect(page.getByRole('button',{name:'Export project'})).toHaveCount(0);await expect(page.getByLabel('Teaching week')).toHaveCount(0);
  await page.getByRole('button',{name:'Next timetable'}).click();await expect(page.getByText('Option 2 of 2')).toBeVisible();
  await downloadImage(page,info.outputPath('registration-guide.png'));
  await page.getByRole('button',{name:'Previous timetable'}).click();await expect(page.getByText('Image not exported',{exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath('planner.png')});
});

test('alternating-week meetings remain readable within a bounded calendar',async({page},info)=>{
  const courses=Array.from({length:8},(_,i)=>{const code='ALT'+(i+1),id=JSON.stringify([code,'L','1','1']);return {code,name:'Alternating week '+(i+1),classes:[{id,courseCode:code,type:'L',number:'1',group:'1',meetings:[{day:1,startMinute:540,endMinute:600,weeks:[i+1],room:'Sample room'}]}]};});
  const path=info.outputPath('alternating.json');await writeFile(path,JSON.stringify({schemaVersion:1,sources:[],courses,selection:{courseCodes:courses.map(c=>c.code),lockedClassIds:[],blocked:[]}}));
  await page.setViewportSize({width:1280,height:720});await importFixturePlan(page,path);await expect(page.getByText('No clashes. Your selected courses fit together.')).toBeVisible();
  for(const button of await page.getByRole('region',{name:'Monday',exact:true}).getByRole('button').all())expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(24);
  await page.getByRole('region',{name:'Monday',exact:true}).getByRole('button',{name:/ALT8 /}).scrollIntoViewIfNeeded();await page.getByRole('region',{name:'Monday',exact:true}).getByRole('button',{name:/ALT8 /}).click();
  await expect(page.locator('.class-details')).toContainText('Alternating week 8');
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('imports multiple dropped HTML pages, without executing scripts or fetching their resources',async({page})=>{
  await page.getByRole('button',{name:'Add slots manually'}).click();
  let probes=0;page.on('request',r=>{if(r.url().includes('/import-probe'))probes++;});
  const html=await readFile('tests/fixtures/student-v2.html','utf8');
  const data=await page.evaluateHandle(({html})=>{const data=new DataTransfer();data.items.add(new File([html+`<script>window.__importExecuted=true;fetch('/import-probe-script')</script><img src="/import-probe-image" onerror="window.__importExecuted=true"><iframe src="/import-probe-frame"></iframe>`],'first.html',{type:'text/html'}));data.items.add(new File([html],'second.htm',{type:'text/html'}));return data;},{html});
  await page.locator('.dropzone').dispatchEvent('drop',{dataTransfer:data});await expect(page.getByText('2 courses',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>Reflect.get(window,'__importExecuted'))).toBeUndefined();expect(probes).toBe(0);await page.getByRole('button',{name:'Use these courses'}).click();await expect(page.getByRole('checkbox',{name:/^TEST1013 /})).not.toBeChecked();
});
test('invalid HTML import preserves the current selection',async({page})=>{
  await demo(page);await page.getByRole('link',{name:'youtar_ttap UTAR timetable planner'}).click();await page.getByRole('button',{name:'Add slots manually'}).click();
  await page.getByRole('button',{name:'Paste HTML'}).click();await page.getByLabel('UTAR course HTML').fill('<html>Login required</html>');await page.getByRole('button',{name:'Preview import'}).click();await expect(page.getByRole('button',{name:'Use these courses'})).toBeDisabled();
  await page.keyboard.press('Escape');await page.getByRole('button',{name:'Back to planner'}).click();await expect(page.getByRole('checkbox',{name:/^TEST2023 /})).toBeChecked();
});

test('time constraints immediately clear an impossible timetable and recover after removal',async({page})=>{
  await demo(page);await page.getByLabel('Until').fill('18:00');await page.getByRole('button',{name:'Add unavailable time'}).click();await page.getByRole('button',{name:'Choose groups for TEST1013'}).click();await page.getByLabel('Lecture for TEST1013').selectOption({label:'Group 1 / #1'});await page.getByRole('button',{name:'Close group selection'}).click();
  await expect(page.getByRole('alert')).toHaveText('Course Clash');await expect(page.getByRole('button',{name:'Export image'})).toBeDisabled();
  await page.getByRole('button',{name:'Remove unavailable time 1'}).click();await expect(page.getByText('No clashes. Your selected courses fit together.')).toBeVisible();await expect(page.getByRole('button',{name:'Export image'})).toBeEnabled();
});

test('narrow layout supports keyboard course selection and panel changes',async({page})=>{
  await page.setViewportSize({width:720,height:900});await page.getByRole('button',{name:'Try demo'}).click();
  await page.getByRole('button',{name:'Courses',exact:true}).click();const checkbox=page.getByRole('checkbox',{name:/^TEST1013 /});await checkbox.focus();await page.keyboard.press('Space');await expect(checkbox).toBeChecked();
  await page.getByRole('button',{name:'Conditions',exact:true}).click();await expect(page.getByText('No clashes. Your selected courses fit together.')).toBeVisible();await page.getByRole('button',{name:'Timetable',exact:true}).click();await expect(page.getByRole('region',{name:'Weekly timetable'})).toContainText('TEST1013');await expect(page.getByRole('button',{name:'Timetable',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('clashing courses move below available courses and selected-course arrows open a bounded group flyout',async({page},info)=>{
  const plan=courseOrderingProject();
  await page.setViewportSize({width:1280,height:720});await importPlan(page,plan);
  const clash=page.getByRole('checkbox',{name:'CLASH1001 Conflicting course'});await expect(clash).toBeDisabled();await expect(clash.locator('xpath=ancestor::article').locator('.course-clash')).toHaveText('Course Clash');
  const codes=()=>page.getByRole('checkbox').evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label')!.split(' ')[0]));
  await expect.poll(codes).toEqual(['DAY1001','FREE1001','CLASH1001']);
  await expect(page.getByRole('button',{name:'Generate',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Open project'})).toHaveCount(0);await expect(page.locator('.planner-actions').getByRole('button',{name:'Export image'})).toBeEnabled();
  await page.getByRole('button',{name:'Choose groups for DAY1001'}).click();const dialog=page.getByRole('dialog',{name:'Groups for DAY1001'});
  const card=await page.getByRole('checkbox',{name:'DAY1001 Full school day'}).locator('xpath=ancestor::article').boundingBox();expect((await dialog.boundingBox())!.x).toBeGreaterThan(card!.x+card!.width-20);
  await expect(dialog.getByLabel('Lecture for DAY1001')).toBeVisible();await page.screenshot({path:info.outputPath('course-groups.png')});
  await page.setViewportSize({width:320,height:667});const box=await dialog.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(320);expect(box!.y+box!.height).toBeLessThanOrEqual(667);
  await page.keyboard.press('Escape');await page.setViewportSize({width:1280,height:720});await page.getByRole('checkbox',{name:'DAY1001 Full school day'}).uncheck();await expect(clash).toBeEnabled();
  await expect.poll(codes).toEqual(['CLASH1001','DAY1001','FREE1001']);
});

test('long course group selectors stay inside the screen and can scroll to the final choice',async({page})=>{
  const plan=schoolDayProject();const course=plan.courses[0];course.name='Long course name used to verify readable group selection without clipping. '.repeat(10);
  course.classes=['L','P','T'].map((type,i)=>({id:JSON.stringify([course.code,type,'1','1']),courseCode:course.code,type,number:'1',group:'1',meetings:[{day:i+1,startMinute:540,endMinute:600,weeks:[1],room:'Sample'}]}));
  await page.setViewportSize({width:1280,height:720});await importPlan(page,plan);await page.getByRole('button',{name:'Choose groups for DAY1001'}).click();
  const dialog=page.getByRole('dialog',{name:'Groups for DAY1001'});const box=await dialog.boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(704);
  const last=dialog.getByLabel('Tutorial for DAY1001');await last.scrollIntoViewIfNeeded();await expect(last).toBeInViewport();await last.selectOption(course.classes[2].id);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
});
