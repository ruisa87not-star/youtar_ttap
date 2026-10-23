import { describe,expect,it } from 'vitest';
import { solveTimetables } from '../../src/core/solveTimetables';
import { meetingsClash } from '../../src/core/clashes';
import { combinations,makeSolveInput } from '../fixtures/solver';
import { makeMeeting } from '../fixtures/projects';
describe('timetable search',()=>{
  it('requires a lecture and tutorial in each of the two solutions',()=>{const r=solveTimetables(makeSolveInput());expect(r.solutions).toHaveLength(2);expect(r.solutions.every(s=>s.classIds.length===2)).toBe(true);expect(r.truncated).toBe(false);});
  it('uses half-open times and intersecting teaching weeks',()=>{const a=makeMeeting();expect(meetingsClash(a,makeMeeting({startMinute:600,endMinute:660}))).toBe(false);expect(meetingsClash(a,makeMeeting({weeks:[4]}))).toBe(false);expect(meetingsClash(a,makeMeeting({startMinute:590,weeks:[3]}))).toBe(true);expect(meetingsClash(a,makeMeeting({day:2}))).toBe(false);});
  it('keeps all meetings of a class together',()=>{const p=makeSolveInput();p.courses[0].classes[0].meetings.push(makeMeeting({day:2}));expect(solveTimetables(p).solutions).toHaveLength(1);});
  it('rejects classes with internally overlapping meetings',()=>{const p=makeSolveInput();p.courses[0].classes[0].meetings.push(makeMeeting({startMinute:570}));expect(solveTimetables(p).solutions).toHaveLength(1);});
  it('honors fixed classes and unavailable times',()=>{const p=makeSolveInput();p.selection.lockedClassIds=[p.courses[0].classes[0].id];expect(solveTimetables(p).solutions).toHaveLength(1);p.selection.blocked=[{day:1,startMinute:550,endMinute:560}];expect(solveTimetables(p).solutions).toEqual([]);});
  it('returns no result for no courses, without confusing it with a valid empty timetable',()=>{const p=makeSolveInput();p.selection.courseCodes=[];expect(solveTimetables(p)).toEqual({solutions:[],truncated:false});});
  it('does not mix equal class numbers in different courses',()=>{expect(solveTimetables(combinations([1,1])).solutions[0]?.classIds).toHaveLength(2);});
  it('returns 500 solutions and detects a 501st',()=>{const r=solveTimetables(combinations(Array(10).fill(2)));expect(r.solutions).toHaveLength(500);expect(r.truncated).toBe(true);});
  it('does not call exactly 500 solutions truncated',()=>{const r=solveTimetables(combinations([5,10,10]));expect(r.solutions).toHaveLength(500);expect(r.truncated).toBe(false);});
  it('is deterministic even if course and option arrays are reordered',()=>{const p=combinations(Array(10).fill(2));const first=solveTimetables(p);p.courses.reverse().forEach(c=>c.classes.reverse());p.selection.courseCodes.reverse();expect(solveTimetables(p)).toEqual(first);expect(first.solutions.every(t=>JSON.stringify(t.classIds)===JSON.stringify([...t.classIds].sort()))).toBe(true);});
  it('rejects invalid input instead of reporting a false no-solution result',()=>{const p=makeSolveInput();p.selection.lockedClassIds=['missing'];expect(()=>solveTimetables(p)).toThrow();});
});
