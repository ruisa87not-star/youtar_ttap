import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {CourseList} from '../../src/renderer/planner/CourseList';
import {makeClass,makeProject} from '../fixtures/projects';

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
