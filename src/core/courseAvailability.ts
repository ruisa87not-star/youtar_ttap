import type {SolveInput} from '../shared/model';
import {hasTimetable} from './solveTimetables';

export function courseAvailability(input:SolveInput):Record<string,boolean>{
  const selected=new Set(input.selection.courseCodes);
  return Object.fromEntries(input.courses.map(course=>[course.code,selected.has(course.code)||hasTimetable({...input,selection:{...input.selection,courseCodes:[...selected,course.code]}})]));
}
