import {render,screen,within} from '@testing-library/react';
import {expect,it} from 'vitest';
import {CourseSummary} from '../../src/renderer/planner/CourseSummary';
import {makeProject} from '../fixtures/projects';
it('marks the total unknown when a valid selected course omits its credits',()=>{
  const project=makeProject();delete project.courses[0].creditHours;
  render(<CourseSummary courses={project.courses} selectedCodes={project.selection.courseCodes}/>);const table=screen.getByRole('table',{name:'Course summary'});
  expect(within(table).getByRole('row',{name:'Total credit hours Unknown'})).toBeInTheDocument();
});
