import type { Course, SolveInput } from '../../src/shared/model';
import { makeClass, makeMeeting, makeProject } from './projects';
export function makeSolveInput(): SolveInput {
  const p=makeProject(); p.courses[0].classes.push(makeClass({number:'3',group:'2',meetings:[makeMeeting({day:3})]}));
  return {courses:p.courses,selection:p.selection};
}
export function combinations(counts: number[]): SolveInput {
  const courses=counts.map((count,i)=>({code:'C'+i,name:'Course '+i,classes:Array.from({length:count},(_,n)=>makeClass({courseCode:'C'+i,number:String(n+1),meetings:[makeMeeting({startMinute:480+i*30,endMinute:510+i*30})]}))}));
  return {courses,selection:{courseCodes:courses.map(c=>c.code),lockedClassIds:[],blocked:[]}};
}
export function fromRawRows(rows: Array<Record<string,unknown>>): Course[] {
  const courses=new Map<string,Course>();
  const time=(s:string)=>{const m=s.trim().match(/(\d+):(\d+)\s*(AM|PM)/i)!;return Number(m[1])%12*60+Number(m[2])+(m[3].toUpperCase()==='PM'?720:0);};
  for(const row of rows){
    const code=String(row.SubjectCode); if(!courses.has(code)) courses.set(code,{code,name:String(row.SubjectName),classes:[]});
    const c=courses.get(code)!; const id=JSON.stringify([code,row.Type,row.Number,row.Group]);
    let option=c.classes.find(s=>s.id===id);
    if(!option){option={id,courseCode:code,type:String(row.Type),number:String(row.Number),group:String(row.Group),meetings:[]};c.classes.push(option);}
    const [start,end]=String(row.TimePeriod).split('-'); const weeks=String(row.WeekNumber).split(',').flatMap(token=>{const [first,last]=token.split('-').map(Number);return Array.from({length:(last??first)-first+1},(_,n)=>first+n);});
    option.meetings.push({day:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(String(row.Day))+1,startMinute:time(start),endMinute:time(end),weeks,room:String(row.Room)});
  }
  return [...courses.values()];
}
