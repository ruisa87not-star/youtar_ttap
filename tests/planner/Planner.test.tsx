import {useState} from 'react';
import {act,render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,expect,it,vi} from 'vitest';
import {Planner} from '../../src/renderer/planner/Planner';
import {TimetableView} from '../../src/renderer/planner/TimetableView';
import {courseAvailability} from '../../src/core/courseAvailability';
import {solveTimetables} from '../../src/core/solveTimetables';
import type {Project,SolveResult} from '../../src/shared/model';
import {makeClass,makeMeeting,makeProject} from '../fixtures/projects';
const solver=vi.hoisted(()=>({solve:vi.fn(),availability:vi.fn(),cancel:vi.fn(),dispose:vi.fn()}));
vi.mock('../../src/workers/SolverClient',()=>({SolverClient:class {solve=solver.solve;availability=solver.availability;cancel=solver.cancel;dispose=solver.dispose;}}));
beforeEach(()=>{vi.clearAllMocks();solver.availability.mockImplementation(async input=>courseAvailability(input));solver.solve.mockImplementation(async input=>solveTimetables(input));});
function Harness({initial=makeProject()}:{initial?:Project}){const[p,setP]=useState(initial);return <Planner project={p} onChange={setP}/>;}
it('reorders actual course availability after selection and Clear without changing the course catalog',async()=>{
  const p=makeProject();p.courses.unshift({code:'CLASH1001',name:'Conflicting course',classes:[makeClass({courseCode:'CLASH1001'})]});p.courses.push({code:'FREE1001',name:'Available course',classes:[makeClass({courseCode:'FREE1001',meetings:[makeMeeting({day:5})]})]});
  const codes=()=>screen.getAllByRole('checkbox').map(input=>input.getAttribute('aria-label')!.split(' ')[0]);
  render(<Harness initial={p}/>);const clash=screen.getByRole('checkbox',{name:/^CLASH1001 /});
  await waitFor(()=>expect(clash).toBeDisabled());await screen.findByText('Course Clash');expect(codes()).toEqual(['TEST1013','FREE1001','CLASH1001']);
  await userEvent.click(screen.getByRole('button',{name:'Clear'}));await waitFor(()=>expect(clash).toBeEnabled());expect(codes()).toEqual(['CLASH1001','TEST1013','FREE1001']);
  await userEvent.click(clash);await waitFor(()=>expect(screen.getByRole('checkbox',{name:/^TEST1013 /})).toBeDisabled());expect(codes()).toEqual(['CLASH1001','FREE1001','TEST1013']);
  expect(p.courses.map(c=>c.code)).toEqual(['CLASH1001','TEST1013','FREE1001']);
});
it('hides and reopens the course sidebar without changing selected classes',async()=>{
  render(<Harness/>);await userEvent.click(screen.getByRole('button',{name:'Choose groups for TEST1013'}));await userEvent.selectOptions(screen.getByLabelText('Lecture for TEST1013'),makeProject().courses[0].classes[0].id);await userEvent.click(screen.getByRole('button',{name:'Close group selection'}));
  await userEvent.click(screen.getByRole('button',{name:'Collapse course sidebar'}));
  const show=screen.getByRole('button',{name:'Expand course sidebar'});expect(show).toHaveAttribute('aria-expanded','false');await userEvent.click(show);
  expect(screen.getByRole('checkbox',{name:'TEST1013 COMPUTING & SOCIETY'})).toBeChecked();await userEvent.click(screen.getByRole('button',{name:'Choose groups for TEST1013'}));expect(screen.getByLabelText('Lecture for TEST1013')).toHaveValue(makeProject().courses[0].classes[0].id);
});
it('generates a timetable, then invalidates it after a condition change',async()=>{
  render(<Harness/>);
  const table=screen.getByRole('region',{name:'Weekly timetable'});expect(await within(table).findAllByText('TEST1013')).toHaveLength(2);
  await userEvent.click(screen.getByRole('checkbox',{name:'TEST1013 COMPUTING & SOCIETY'}));
  expect(within(table).queryAllByText('TEST1013')).toHaveLength(0);expect(screen.queryByRole('button',{name:'Generate'})).toBeNull();
});
it('keeps cancel available and ignores results after a condition change',async()=>{
  let finish!:(r:SolveResult)=>void;solver.solve.mockImplementation(()=>new Promise(resolve=>finish=resolve));
  render(<Harness/>);expect(screen.getByRole('button',{name:'Cancel calculation'})).toBeEnabled();
  await userEvent.click(screen.getByRole('checkbox',{name:'TEST1013 COMPUTING & SOCIETY'}));
  await act(async()=>finish(solveTimetables({courses:makeProject().courses,selection:makeProject().selection})));
  expect(within(screen.getByRole('region',{name:'Weekly timetable'})).queryAllByText('TEST1013')).toHaveLength(0);
});
it('cancels without showing an error',async()=>{
  solver.solve.mockImplementation(()=>new Promise(()=>{}));render(<Harness/>);
  await userEvent.click(screen.getByRole('button',{name:'Cancel calculation'}));expect(screen.queryByRole('alert')).toBeNull();
});
it('passes a fixed class and unavailable time to the solver and reports no solution',async()=>{
  render(<Harness/>);await userEvent.click(screen.getByRole('button',{name:'Choose groups for TEST1013'}));await userEvent.selectOptions(screen.getByLabelText('Lecture for TEST1013'),makeProject().courses[0].classes[0].id);await userEvent.click(screen.getByRole('button',{name:'Close group selection'}));
  await userEvent.click(screen.getByRole('button',{name:'Add unavailable time'}));
  expect(await screen.findByRole('alert')).toHaveTextContent(/^Course Clash$/);
  expect(solver.solve.mock.calls.at(-1)?.[0].selection.lockedClassIds).toHaveLength(1);
});
it('shows a limit notice instead of claiming a complete result count',async()=>{
  solver.solve.mockResolvedValue({solutions:[{classIds:makeProject().courses[0].classes.map(c=>c.id)}],truncated:true});render(<Harness/>);
  expect(await screen.findByText(/Showing the first 500/)).toBeInTheDocument();
});
it('shows every meeting without a teaching-week filter, including alternating weeks',()=>{
  const a=makeClass({meetings:[makeMeeting({weeks:[1]})]});const b=makeClass({courseCode:'OTHER1013',meetings:[makeMeeting({weeks:[2]})]});
  const courses=[{code:'TEST1013',name:'One',classes:[a]},{code:'OTHER1013',name:'Two',classes:[b]}];
  const props={courses,timetable:{classIds:[a.id,b.id]}};
  render(<TimetableView {...props}/>);expect(screen.getByText('TEST1013')).toBeInTheDocument();expect(screen.getByText('OTHER1013')).toBeInTheDocument();
  const buttons=screen.getByRole('region',{name:'Monday'}).querySelectorAll('button');
  expect(buttons[0].style.top).not.toBe(buttons[1].style.top);
});
it('blocks an incompatible course at its card without clearing the valid timetable',async()=>{
  const p=makeProject();p.selection.courseCodes=[];
  p.courses.push({code:'OTHER1013',name:'Conflicting course',classes:[makeClass({courseCode:'OTHER1013'})]});
  render(<Harness initial={p}/>);
  await userEvent.click(screen.getByRole('checkbox',{name:'TEST1013 COMPUTING & SOCIETY'}));
  expect(await screen.findByText('No clashes. Your selected courses fit together.')).toBeInTheDocument();
  const blocked=screen.getByRole('checkbox',{name:'OTHER1013 Conflicting course'});expect(blocked).toBeDisabled();expect(blocked.closest('article')).toHaveTextContent('Course Clash');
  await userEvent.click(blocked);expect(blocked).not.toBeChecked();
  expect(within(screen.getByRole('region',{name:'Weekly timetable'})).queryAllByText('TEST1013')).toHaveLength(2);
  await userEvent.click(screen.getByRole('checkbox',{name:'TEST1013 COMPUTING & SOCIETY'}));expect(blocked).toBeEnabled();
  expect(screen.queryByLabelText('Teaching week')).toBeNull();
});
it('finds a compatible alternative immediately instead of rejecting an overlapping first group',async()=>{
  const p=makeProject();p.courses[0].classes.push(makeClass({number:'3',group:'2',meetings:[makeMeeting({day:3})]}));
  p.courses.push({code:'OTHER1013',name:'Other',classes:[makeClass({courseCode:'OTHER1013'})]});
  render(<Harness initial={p}/>);await userEvent.click(screen.getByRole('checkbox',{name:'OTHER1013 Other'}));
  expect(await screen.findByText('No clashes. Your selected courses fit together.')).toBeInTheDocument();
  expect(screen.getByRole('region',{name:'Wednesday'}).querySelector('button')).not.toBeNull();
  await userEvent.click(screen.getByRole('button',{name:'Choose groups for TEST1013'}));await userEvent.selectOptions(screen.getByLabelText('Lecture for TEST1013'),p.courses[0].classes[0].id);await userEvent.click(screen.getByRole('button',{name:'Close group selection'}));
  expect(await screen.findByRole('alert')).toHaveTextContent(/^Course Clash$/);
});
it('previews visual time constraints before applying them to the project',async()=>{
  render(<Harness/>);await screen.findByText('Option 1 of 1');
  await userEvent.click(screen.getByRole('button',{name:'Set time constraint'}));const dialog=screen.getByRole('dialog',{name:'Set time constraint'});
  await userEvent.click(within(dialog).getByRole('button',{name:'Monday 09:00–09:30'}));expect(dialog).toHaveTextContent('0 of 1 shown options remain');
  await userEvent.click(within(dialog).getByRole('button',{name:'Apply constraints'}));expect(screen.queryByRole('dialog')).toBeNull();expect(screen.getByRole('button',{name:'Remove unavailable time 1'})).toBeInTheDocument();
});
