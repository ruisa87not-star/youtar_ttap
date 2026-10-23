import {fireEvent,render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import {App} from '../../src/renderer/App';
import {courseAvailability} from '../../src/core/courseAvailability';
import {solveTimetables} from '../../src/core/solveTimetables';
vi.mock('../../src/workers/SolverClient',()=>({SolverClient:class {solve=async(input:Parameters<typeof solveTimetables>[0])=>solveTimetables(input);availability=async(input:Parameters<typeof solveTimetables>[0])=>courseAvailability(input);cancel(){}dispose(){}}}));

it('starts with a tutorial that supports next, previous, skip and replay',async()=>{
  render(<App/>);expect(screen.getByRole('heading',{name:'A quick tour of youtar_ttap.'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Previous step'})).toBeDisabled();
  await userEvent.click(screen.getByRole('button',{name:'Next step'}));expect(screen.getByRole('heading',{name:'Choose your courses and free time.'})).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button',{name:'Previous step'}));expect(screen.getByRole('heading',{name:'Get your course data.'})).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button',{name:'Skip tutorial'}));expect(screen.getByRole('region',{name:'Integrated course registration'})).toBeVisible();
  expect(screen.getByTitle('UTAR Course Registration System')).toHaveAttribute('src','https://unitreg.utar.edu.my/portal/courseRegStu/login.jsp');
  expect(screen.queryByRole('link',{name:'Open Course Registration System'})).toBeNull();
  await userEvent.click(screen.getByRole('button',{name:'Tutorial'}));await userEvent.click(screen.getByRole('button',{name:'Next step'}));await userEvent.click(screen.getByRole('button',{name:'Next step'}));await userEvent.click(screen.getByRole('button',{name:'Start planning'}));
  expect(screen.getByRole('region',{name:'Integrated course registration'})).toBeVisible();
});

it('returns from planner to import and back without losing selection or generated options',async()=>{
  render(<App/>);await userEvent.click(screen.getByRole('button',{name:'Skip tutorial'}));
  await userEvent.click(screen.getByRole('button',{name:'Try demo'}));
  expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(15);
  expect(within(screen.getByRole('region',{name:'Weekly timetable'})).getByText('Sun',{exact:true})).toBeVisible();
  await userEvent.click(screen.getByRole('checkbox',{name:'TEST1013 COMPUTING & SOCIETY'}));
  expect(await screen.findByText('Option 1 of 2')).toBeVisible();
  await userEvent.click(screen.getByRole('button',{name:'Go back'}));expect(screen.getByRole('region',{name:'Integrated course registration'})).toBeVisible();
  expect(screen.getByRole('heading',{name:'Import courses.'})).toHaveFocus();
  await userEvent.click(screen.getByRole('button',{name:'Tutorial'}));await userEvent.click(screen.getByRole('button',{name:'Skip tutorial'}));expect(screen.getByRole('heading',{name:'Import courses.'})).toHaveFocus();
  await userEvent.click(screen.getByRole('button',{name:'Back to planner'}));expect(screen.getByRole('checkbox',{name:'TEST1013 COMPUTING & SOCIETY'})).toBeChecked();expect(screen.getByText('Option 1 of 2')).toBeVisible();
  await userEvent.click(screen.getByRole('button',{name:'Tutorial'}));expect(screen.queryByRole('link',{name:'Open Course Registration System'})).toBeNull();await userEvent.click(screen.getByRole('button',{name:'Skip tutorial'}));expect(screen.getByText('Option 1 of 2')).toBeVisible();
});

it('opens manual slots in a floating dialog and dismisses it by clicking the backdrop',async()=>{
  render(<App/>);await userEvent.click(screen.getByRole('button',{name:'Skip tutorial'}));
  expect(screen.queryByRole('dialog')).toBeNull();await userEvent.click(screen.getByRole('button',{name:'Add slots manually'}));
  const dialog=screen.getByRole('dialog',{name:'Add slots manually'});
  const guide=screen.getByRole('region',{name:'Manual slot import guide'});
  expect(within(guide).getByText('Open Course Timetable Preview.',{exact:true})).toBeVisible();expect(within(guide).getByText('Ctrl + U')).toBeVisible();expect(within(guide).getByText(/all pages together/)).toBeVisible();
  fireEvent.pointerDown(dialog,{clientX:-1,clientY:-1});fireEvent.click(dialog,{clientX:-1,clientY:-1});expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('region',{name:'Integrated course registration'})).toBeVisible();
});
