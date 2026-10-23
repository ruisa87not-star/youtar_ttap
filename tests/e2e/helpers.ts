import {expect,type Page} from '@playwright/test';
import type {Project} from '../../src/shared/model';
import {decodeProject} from '../../src/shared/project';
import {solveTimetables} from '../../src/core/solveTimetables';
import {readFile} from 'node:fs/promises';
export async function demo(page:Page){
  await page.getByRole('button',{name:'Try demo'}).click();if(await page.getByRole('button',{name:'Courses',exact:true}).isVisible())await page.getByRole('button',{name:'Courses',exact:true}).click();
  await expect(page.getByRole('checkbox',{name:/^TEST1013 /})).not.toBeChecked();
  await page.getByRole('checkbox',{name:/^TEST1013 /}).check();await page.getByRole('checkbox',{name:/^TEST2023 /}).check();
}
export async function configure(page:Page){
  await page.getByRole('button',{name:'Choose groups for TEST1013'}).click();
  await page.getByLabel('Tutorial for TEST1013').selectOption({label:'Group 1 / #3'});
  await page.getByRole('button',{name:'Close group selection'}).click();
  await page.getByRole('combobox',{name:'Day',exact:true}).selectOption('6');await page.getByRole('button',{name:'Add unavailable time'}).click();
}
export async function waitForTimetable(page:Page){if(await page.getByRole('button',{name:'Timetable',exact:true}).isVisible())await page.getByRole('button',{name:'Timetable',exact:true}).click();await expect(page.getByText('Option 1 of 2')).toBeVisible();}
export async function expectPrimaryActionInViewport(page:Page){
  await expect(page.getByRole('button',{name:'Export image',exact:true})).toBeVisible();
  const box=await page.getByRole('button',{name:'Export image',exact:true}).boundingBox();
  const height=await page.evaluate(()=>innerHeight);
  expect(box).not.toBeNull();expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(height);
}
export function schoolDayProject():Project{
  const code='DAY1001';const id=JSON.stringify([code,'L','1','1']);
  return {schemaVersion:1,sources:['Synthetic school-day fixture'],courses:[{code,name:'Full school day',classes:[{id,courseCode:code,type:'L',number:'1',group:'1',meetings:[{day:1,startMinute:480,endMinute:540,weeks:[1],room:'Morning room'},{day:5,startMinute:1020,endMinute:1080,weeks:[1],room:'Evening room'}]}]}],selection:{courseCodes:[code],lockedClassIds:[],blocked:[]}};
}
export async function expectSchoolDayInViewport(page:Page){
  expect(await page.locator('.day-label').allTextContents()).toEqual(['Mon','Tue','Wed','Thu','Fri','Sat','Sun']);
  const frame=await page.locator('.calendar-scroll').boundingBox();expect(frame).not.toBeNull();
  for(const time of ['08:00','18:00']){
    const box=await page.locator('.time-axis').getByLabel(time,{exact:true}).boundingBox();expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(frame!.y-1);expect(box!.y+box!.height).toBeLessThanOrEqual(frame!.y+frame!.height+1);
    expect(box!.x).toBeGreaterThanOrEqual(frame!.x-1);expect(box!.x+box!.width).toBeLessThanOrEqual(frame!.x+frame!.width+1);
  }
  expect(await page.locator('.calendar-scroll').evaluate(e=>e.scrollHeight<=e.clientHeight+1)).toBe(true);
  expect(await page.locator('.time-axis time').evaluateAll(labels=>labels.every((label,i)=>i===0||labels[i-1].getBoundingClientRect().right<=label.getBoundingClientRect().left+1))).toBe(true);
  expect(await page.locator('.day-label').evaluateAll(labels=>labels.every((label,i)=>i===0||labels[i-1].getBoundingClientRect().bottom<=label.getBoundingClientRect().top+1))).toBe(true);
  for(const day of ['Monday','Friday']){
    const column=page.getByRole('region',{name:day,exact:true});const box=await column.getByRole('button').boundingBox();
    expect(box!.y).toBeGreaterThanOrEqual(frame!.y);expect(box!.y+box!.height).toBeLessThanOrEqual(frame!.y+frame!.height+1);
  }
  const monday=await page.getByRole('region',{name:'Monday',exact:true}).getByRole('button').boundingBox(),friday=await page.getByRole('region',{name:'Friday',exact:true}).getByRole('button').boundingBox();
  expect(friday!.x).toBeGreaterThan(monday!.x);expect(friday!.y).toBeGreaterThan(monday!.y);
  expect(await page.locator('.calendar-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);
  expect(frame!.y+frame!.height).toBeLessThanOrEqual(await page.evaluate(()=>innerHeight));
  await expect(page.getByLabel('Teaching week')).toHaveCount(0);
}
export async function expectPng(path:string){
  const png=await readFile(path);expect([...png.subarray(0,8)]).toEqual([137,80,78,71,13,10,26,10]);
  expect(png.readUInt32BE(16)).toBe(1600);expect(png.readUInt32BE(20)).toBeGreaterThan(1000);expect(png.length).toBeGreaterThan(20000);
}
export async function downloadImage(page:Page,path:string){
  const event=page.waitForEvent('download');await page.getByRole('button',{name:'Export image'}).click();await (await event).saveAs(path);
  await page.getByRole('button',{name:'I kept the file'}).click();await expect(page.getByText('Image exported',{exact:true})).toBeVisible();await expectPng(path);
}
export async function importFixturePlan(page:Page,path:string){await importPlan(page,await readProject(path));}
export function planHtml(project:Project):string{
  const esc=(value:unknown)=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');const time=(minute:number)=>String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
  return '<div id="overviewSector"><table><tr>'+['No','Type','Group','Class size','Day','Time','Hours','Week','Room','Remark'].map(label=>'<th>'+label+'</th>').join('')+'</tr>'+project.courses.map(course=>`<tr><td colspan="10">${esc(course.code)} - ${esc(course.name)} [${course.creditHours??3}]</td></tr>`+course.classes.flatMap(option=>option.meetings.map(meeting=>'<tr>'+[option.number,option.type,option.group,'40',['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][meeting.day-1],`${time(meeting.startMinute)} - ${time(meeting.endMinute)}`,'1',meeting.weeks.join(','),meeting.room,option.remark??''].map(value=>'<td>'+esc(value)+'</td>').join('')+'</tr>')).join('')).join('')+'</table></div>';
}
export async function importPlan(page:Page,project:Project){
  if(await page.getByRole('heading',{name:'Build your week.'}).isVisible())await page.getByRole('link',{name:'youtar_ttap UTAR timetable planner'}).click();
  await page.getByRole('button',{name:'Add slots manually'}).click();await page.getByRole('button',{name:'Paste HTML'}).click();await page.getByLabel('UTAR course HTML').fill(planHtml(project));await page.getByRole('button',{name:'Preview import'}).click();await page.getByRole('button',{name:'Use these courses'}).click();
  if(await page.getByRole('button',{name:'Discard changes'}).isVisible())await page.getByRole('button',{name:'Discard changes'}).click();
  if(await page.getByRole('button',{name:'Courses',exact:true}).isVisible())await page.getByRole('button',{name:'Courses',exact:true}).click();
  for(const code of project.selection.courseCodes)await page.getByRole('checkbox',{name:new RegExp('^'+code+' ')}).check();
  for(const course of project.courses){const locks=course.classes.filter(option=>project.selection.lockedClassIds.includes(option.id));if(!locks.length)continue;await page.getByRole('button',{name:'Choose groups for '+course.code}).click();for(const option of locks)await page.getByLabel((({L:'Lecture',T:'Tutorial',P:'Practical'} as Record<string,string>)[option.type]??option.type)+' for '+course.code).selectOption(option.id);await page.getByRole('button',{name:'Close group selection'}).click();}
  if(project.selection.blocked.length&&await page.getByRole('button',{name:'Conditions',exact:true}).isVisible())await page.getByRole('button',{name:'Conditions',exact:true}).click();
  const time=(minute:number)=>String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
  for(const blocked of project.selection.blocked){await page.getByRole('combobox',{name:'Day',exact:true}).selectOption(String(blocked.day));await page.getByLabel('From',{exact:true}).fill(time(blocked.startMinute));await page.getByLabel('Until',{exact:true}).fill(time(blocked.endMinute));await page.getByRole('button',{name:'Add unavailable time'}).click();}
  if(await page.getByRole('button',{name:'Timetable',exact:true}).isVisible())await page.getByRole('button',{name:'Timetable',exact:true}).click();
}
export async function readProject(path:string):Promise<Project>{const result=decodeProject(await readFile(path,'utf8'));if(!result.ok)throw new Error(result.errors.join(' '));return result.value;}
export async function expectCandidate(page:Page,project:Project,index=0){
  const timetable=solveTimetables({courses:project.courses,selection:project.selection}).solutions[index];
  const names=await page.getByRole('region',{name:'Weekly timetable'}).getByRole('button').evaluateAll(elements=>elements.map(e=>e.getAttribute('aria-label')??''));
  const types:Record<string,string>={L:'Lecture',T:'Tutorial',P:'Practical'};
  const actual=project.courses.flatMap(c=>c.classes.filter(o=>names.some(n=>n.startsWith(`${c.code} ${c.name}, ${types[o.type]??o.type} group ${o.group}, `))).map(o=>o.id)).sort();
  expect(actual).toEqual(timetable.classIds);
}
export function difficultProject():Project{
  const courses=Array.from({length:28},(_,i)=>{
    const code='LOAD'+String(i).padStart(2,'0');const slot=i===27?26:i;const startMinute=480+(slot%20)*30;
    return {code,name:'Cancellation fixture '+i,classes:[1,2].map(n=>({id:JSON.stringify([code,'L',String(n),String(n)]),courseCode:code,type:'L',number:String(n),group:String(n),meetings:[{day:1+Math.floor(slot/20),startMinute,endMinute:startMinute+30,weeks:[1],room:'Test'}]}))};
  });
  return {schemaVersion:1,sources:['Synthetic cancellation test'],courses,selection:{courseCodes:courses.map(c=>c.code),lockedClassIds:[],blocked:[]}};
}
