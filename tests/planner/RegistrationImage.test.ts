import {afterEach,expect,it,vi} from 'vitest';
import {renderRegistrationImage} from '../../src/renderer/planner/registrationImage';
import {makeProject} from '../fixtures/projects';

afterEach(()=>vi.restoreAllMocks());
it('renders the chosen groups, class numbers, full course names, meetings and registration steps into PNG',()=>{
  const texts:string[]=[];
  const context={fillRect:vi.fn(),strokeRect:vi.fn(),fillText:(text:string)=>texts.push(text),measureText:(text:string)=>({width:text.length*10}),save:vi.fn(),restore:vi.fn(),beginPath:vi.fn(),rect:vi.fn(),clip:vi.fn()};
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as never);
  vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,example');
  const p=makeProject();p.courses[0].classes.push({...p.courses[0].classes[0],id:'unchosen',group:'99'});
  const png=renderRegistrationImage(p,{classIds:p.courses[0].classes.slice(0,2).map(c=>c.id)});
  expect(png).toMatch(/^data:image\/png;base64,/);
  const all=texts.join('\n');
  for(const text of ['TEST1013','COMPUTING & SOCIETY','Lecture: group 1 / class #1','Tutorial: group 1 / class #2','KB101','09:00','Weeks 1, 2, 3','Total credit hours: 3','Course Registration System','Confirm'])expect(all).toContain(text);
  expect(all).not.toContain('group 99');
});
it('refuses an empty or incomplete course selection instead of exporting a misleading guide',()=>{
  const p=makeProject();expect(()=>renderRegistrationImage(p,{classIds:[]})).toThrow();
  expect(()=>renderRegistrationImage(p,{classIds:[p.courses[0].classes[0].id]})).toThrow();
});
it('keeps PNG hours and unavailable shading bounded when constraints extend beyond the visible school day',()=>{
  const labels:string[]=[];const rectangles:number[][]=[];
  const context={fillRect:(...args:number[])=>rectangles.push(args),strokeRect:vi.fn(),fillText:(text:string)=>labels.push(text),measureText:(text:string)=>({width:text.length*10}),save:vi.fn(),restore:vi.fn(),beginPath:vi.fn(),rect:vi.fn(),clip:vi.fn()};
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as never);vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockReturnValue('data:image/png;base64,example');
  const p=makeProject();p.selection.blocked=[{day:7,startMinute:360,endMinute:540},{day:6,startMinute:1020,endMinute:1440}];renderRegistrationImage(p,{classIds:p.courses[0].classes.map(c=>c.id)});
  expect(labels).not.toContain('06:00');expect(labels).not.toContain('24:00');expect(labels).toContain('08:00');expect(labels).toContain('18:00');
  expect(rectangles.every(([left,,width])=>left>=0&&left+width<=1600)).toBe(true);
});
