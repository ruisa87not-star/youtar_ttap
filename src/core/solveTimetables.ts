import type {ClassOption,Meeting,SolveInput,SolveResult} from '../shared/model';
import {MAX_SOLUTIONS,validateProject} from '../shared/project';
import {meetingsClash,periodsOverlap} from './clashes';
const compare=(a:string,b:string)=>a<b?-1:a>b?1:0;

// The upstream FindTimetable search: partition by course/type, try the smallest
// partition first, and prune conflicting paths. See UPSTREAM.md for the port.
export function solveTimetables(input:SolveInput):SolveResult {
  return searchTimetables(input,false);
}
export function hasTimetable(input:SolveInput):boolean{return searchTimetables(input,true).solutions.length>0;}
function searchTimetables(input:SolveInput,firstOnly:boolean):SolveResult {
  const checked=validateProject({schemaVersion:1,sources:[],courses:input.courses,selection:input.selection});
  if(!checked.ok) throw new Error(checked.errors.join('\n'));
  const {courses,selection}=checked.value; const result:SolveResult={solutions:[],truncated:false};
  if(!selection.courseCodes.length) return result;
  const selected=new Set(selection.courseCodes); const locks=new Set(selection.lockedClassIds);
  const partitions=new Map<string,ClassOption[]>();
  for(const course of courses.filter(c=>selected.has(c.code))) {
    for(const type of new Set(course.classes.map(c=>c.type))) {
      let options=course.classes.filter(c=>c.type===type);
      const fixed=options.find(c=>locks.has(c.id)); if(fixed) options=[fixed];
      options=options.filter(c=>!c.meetings.some((m,i)=>c.meetings.slice(i+1).some(n=>meetingsClash(m,n))) && !c.meetings.some(m=>selection.blocked.some(b=>periodsOverlap(m,b))));
      if(!options.length) return result;
      partitions.set(JSON.stringify([course.code,type]),options.sort((a,b)=>compare(a.id,b.id)));
    }
  }
  const groups=[...partitions.entries()].sort((a,b)=>a[1].length-b[1].length || compare(a[0],b[0])).map(([,options])=>options);
  const chosen:ClassOption[]=[];
  function search(depth:number,occupied:Meeting[]):boolean {
    if(depth===groups.length) {
      // Only a discovered 501st result proves there are more than 500.
      if(result.solutions.length===MAX_SOLUTIONS){result.truncated=true;return true;}
      result.solutions.push({classIds:chosen.map(c=>c.id).sort(compare)}); return firstOnly;
    }
    for(const option of groups[depth]) {
      if(option.meetings.some(m=>occupied.some(n=>meetingsClash(m,n)))) continue;
      chosen.push(option);
      if(search(depth+1,occupied.concat(option.meetings))) return true;
      chosen.pop();
    }
    return false;
  }
  search(0,[]); return result;
}
