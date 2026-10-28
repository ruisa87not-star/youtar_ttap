import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {CourseList} from '../../src/renderer/planner/CourseList';
import {makeClass,makeProject} from '../fixtures/projects';
const course=(code:string)=>({code,name:'Order fixture',classes:[makeClass({courseCode:code})]});
const visibleCodes=()=>screen.getAllByRole('checkbox').map(input=>input.getAttribute('aria-label')!.split(' ')[0]);

it('moves only confirmed unselected clashes to the bottom, preserving each group and the source order',()=>{
  const p=makeProject();p.courses=[course('ZZZ1001'),...p.courses,course('BBB1001'),course('AAA1001'),course('CCC1001')];const original=p.courses.map(c=>c.code);
  render(<CourseList project={p} onChange={vi.fn()} availability={{ZZZ1001:false,TEST1013:false,BBB1001:true,AAA1001:false,CCC1001:true}}/>);
  expect(visibleCodes()).toEqual(['TEST1013','BBB1001','CCC1001','ZZZ1001','AAA1001']);
  expect(p.courses.map(c=>c.code)).toEqual(original);expect(screen.getByRole('checkbox',{name:/^TEST1013 /})).toBeEnabled();
});
it('does not treat pending availability as a clash or change the order until a clash is confirmed',()=>{
  const p=makeProject();p.courses=[course('BLOCK1001'),...p.courses,course('PENDING1001')];const onChange=vi.fn();
  const {rerender}=render(<CourseList project={p} onChange={onChange}/>);
  expect(visibleCodes()).toEqual(['BLOCK1001','TEST1013','PENDING1001']);
  rerender(<CourseList project={p} onChange={onChange} availability={{BLOCK1001:false,TEST1013:true}}/>);
  expect(visibleCodes()).toEqual(['TEST1013','PENDING1001','BLOCK1001']);
  expect(screen.getByRole('checkbox',{name:/^PENDING1001 /}).closest('article')).toHaveTextContent('Checking course availability…');
});
it('keeps search filtering and restores source order when a filtered course no longer clashes',async()=>{
  const p=makeProject();p.courses=[course('MATCH_BLOCKED'),...p.courses,course('MATCH_FREE')];const onChange=vi.fn();
  const {rerender}=render(<CourseList project={p} onChange={onChange} availability={{MATCH_BLOCKED:false,TEST1013:true,MATCH_FREE:true}}/>);
  await userEvent.type(screen.getByRole('searchbox'),'MATCH');expect(visibleCodes()).toEqual(['MATCH_FREE','MATCH_BLOCKED']);
  rerender(<CourseList project={p} onChange={onChange} availability={{MATCH_BLOCKED:true,TEST1013:true,MATCH_FREE:true}}/>);
  expect(visibleCodes()).toEqual(['MATCH_BLOCKED','MATCH_FREE']);expect(onChange).not.toHaveBeenCalled();
});

it('disables a clashing card with an explanation while allowing selected courses to be removed',async()=>{
  const p=makeProject();p.courses.push({code:'OTHER1013',name:'Other',classes:[makeClass({courseCode:'OTHER1013'})]});const onChange=vi.fn();
  render(<CourseList project={p} onChange={onChange} availability={{TEST1013:true,OTHER1013:false}}/>);
  const blocked=screen.getByRole('checkbox',{name:'OTHER1013 Other'});expect(blocked).toBeDisabled();
  expect(blocked.closest('article')?.querySelector('.course-clash')).toHaveTextContent(/^Course Clash$/);await userEvent.click(blocked);expect(onChange).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('checkbox',{name:'TEST1013 COMPUTING & SOCIETY'}));expect(onChange.mock.calls[0][0].courseCodes).toEqual([]);
});
it('clears every selected course and fixed group while preserving unavailable time',async()=>{
  const p=makeProject();p.selection.lockedClassIds=[p.courses[0].classes[0].id];p.selection.blocked=[{day:7,startMinute:600,endMinute:660}];const onChange=vi.fn();
  render(<CourseList project={p} onChange={onChange} availability={{TEST1013:true}}/>);
  await userEvent.type(screen.getByRole('searchbox'),'unmatched filter');await userEvent.click(screen.getByRole('button',{name:'Clear'}));
  expect(onChange).toHaveBeenCalledWith({courseCodes:[],lockedClassIds:[],blocked:[{day:7,startMinute:600,endMinute:660}]});
});
it('opens lecture and tutorial choices to the right only through the selected course arrow',async()=>{
  render(<CourseList project={makeProject()} onChange={vi.fn()} availability={{TEST1013:true}}/>);
  expect(screen.queryByLabelText('Lecture for TEST1013')).toBeNull();
  await userEvent.click(screen.getByRole('button',{name:'Choose groups for TEST1013'}));
  const dialog=screen.getByRole('dialog',{name:'Groups for TEST1013'});
  expect(within(dialog).getByLabelText('Lecture for TEST1013')).toBeEnabled();expect(within(dialog).getByLabelText('Tutorial for TEST1013')).toBeEnabled();
  await userEvent.click(within(dialog).getByRole('button',{name:'Close group selection'}));expect(screen.queryByRole('dialog')).toBeNull();
});
