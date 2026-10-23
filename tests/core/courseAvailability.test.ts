import {expect,it} from 'vitest';
import {courseAvailability} from '../../src/core/courseAvailability';
import {makeClass,makeMeeting,makeProject} from '../fixtures/projects';

it('disables an impossible course while keeping selected courses removable',()=>{
  const p=makeProject();p.courses.push({code:'OTHER1013',name:'Other',classes:[makeClass({courseCode:'OTHER1013'})]});
  expect(courseAvailability(p)).toEqual({'TEST1013':true,'OTHER1013':false});
  p.selection.courseCodes=[];expect(courseAvailability(p)).toEqual({'TEST1013':true,'OTHER1013':true});
});
it('allows an alternative group or disjoint weeks and honors unavailable time and fixed groups',()=>{
  const p=makeProject();p.courses.push({code:'OTHER1013',name:'Other',classes:[makeClass({courseCode:'OTHER1013'}),makeClass({courseCode:'OTHER1013',number:'2',group:'2',meetings:[makeMeeting({day:3})]})]});
  expect(courseAvailability(p)['OTHER1013']).toBe(true);
  p.selection.blocked=[{day:3,startMinute:540,endMinute:600}];expect(courseAvailability(p)['OTHER1013']).toBe(false);
  p.courses[1].classes[0].meetings[0].weeks=[4];expect(courseAvailability(p)['OTHER1013']).toBe(true);
  p.selection.blocked=[];p.courses[0].classes.push(makeClass({number:'3',group:'2',meetings:[makeMeeting({day:4})]}));
  p.courses[1].classes=p.courses[1].classes.slice(0,1);p.courses[1].classes[0].meetings[0].weeks=[1];
  expect(courseAvailability(p)['OTHER1013']).toBe(true);p.selection.lockedClassIds=[p.courses[0].classes[0].id];expect(courseAvailability(p)['OTHER1013']).toBe(false);
});
