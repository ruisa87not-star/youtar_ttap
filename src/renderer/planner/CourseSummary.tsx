import type {Course,Timetable} from '../../shared/model';
export function CourseSummary({courses:catalog,selectedCodes,timetable}:{courses:Course[];selectedCodes:string[];timetable?:Timetable}){
  const courses=catalog.filter(c=>selectedCodes.includes(c.code));
  const ids=new Set(timetable?.classIds??[]);
  const total=courses.some(c=>c.creditHours===undefined)?'Unknown':courses.reduce((sum,c)=>sum+(c.creditHours??0),0);
  return <div className="course-summary"><table aria-label="Course summary"><thead><tr>{['Code','Name','Lecture','Tutorial','Practical','Credits'].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{courses.map(c=><tr key={c.code} className={'tone-'+catalog.indexOf(c)%6}><th>{c.code}</th><td title={c.name} className="summary-name">{c.name}</td>{['L','T','P'].map(type=><td key={type}>{c.classes.filter(o=>o.type===type&&ids.has(o.id)).map(o=>`${type}(${o.group}) · ${o.meetings[0]?.room||'No room'}`).join(', ')||'—'}</td>)}<td>{c.creditHours??'—'}</td></tr>)}</tbody><tfoot><tr><th colSpan={5}>Total credit hours</th><td>{total}</td></tr></tfoot></table></div>;
}
