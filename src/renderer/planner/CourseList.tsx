import {useId,useState} from 'react';
import {createPortal} from 'react-dom';
import type {Project,Selection} from '../../shared/model';
import {ProjectDialog} from '../ProjectActions';
const names=new Map([['L','Lecture'],['T','Tutorial'],['P','Practical']]);
export const typeName=(type:string)=>names.get(type)??type;
export function CourseList({project,onChange,availability}:{project:Project;onChange:(s:Selection)=>void;availability?:Record<string,boolean>}){
  const[search,setSearch]=useState('');const selected=new Set(project.selection.courseCodes);
  const[groups,setGroups]=useState<{code:string;left:number;top:number}|null>(null);const statusId=useId();
  const chosen=project.courses.find(c=>c.code===groups?.code&&selected.has(c.code));
  const hasClash=(code:string)=>!selected.has(code)&&availability?.[code]===false;
  const visibleCourses=project.courses.filter(c=>(c.code+' '+c.name).toLowerCase().includes(search.toLowerCase()))
    .sort((a,b)=>Number(hasClash(a.code))-Number(hasClash(b.code)));
  const groupTop=groups?`min(${groups.top}px, max(16px, calc(100dvh - 360px)))`:'16px';
  function toggle(code:string){
    const next=new Set(selected);if(next.has(code))next.delete(code);else next.add(code);
    const validIds=new Set(project.courses.filter(c=>next.has(c.code)).flatMap(c=>c.classes.map(s=>s.id)));
    onChange({...project.selection,courseCodes:[...next],lockedClassIds:project.selection.lockedClassIds.filter(id=>validIds.has(id))});
  }
  return <><div className="panel-heading"><div className="course-heading"><h2>Courses</h2></div><span>{project.courses.length}</span></div><div className="course-controls"><input className="search-input" type="search" aria-label="Search courses" placeholder="Search code or course name" value={search} onChange={e=>setSearch(e.target.value)}/><button disabled={!selected.size} onClick={()=>{setGroups(null);onChange({...project.selection,courseCodes:[],lockedClassIds:[]});}}>Clear</button></div>
    <div className="course-list">{visibleCourses.map(c=>{
      const isSelected=selected.has(c.code);
      const available=availability?.[c.code];const disabled=!isSelected&&available!==true;const reasonId=statusId+'-'+project.courses.indexOf(c);
      return <article className={'course-card tone-'+project.courses.indexOf(c)%6+(isSelected?' selected':'')} key={c.code}>
        <div className="course-card-row"><label className={'course-choice'+(disabled?' course-disabled':'')}><input type="checkbox" aria-label={c.code+' '+c.name} aria-describedby={disabled?reasonId:undefined} disabled={disabled} checked={isSelected} onChange={()=>{if(!disabled)toggle(c.code);}}/><span><b>{c.code}</b><span className="course-name">{c.name}</span><small>{c.classes.length} classes{c.creditHours!==undefined?' / '+c.creditHours+' credits':''}</small></span></label>
        {isSelected&&<button className="group-arrow quiet" aria-label={'Choose groups for '+c.code} aria-haspopup="dialog" aria-expanded={chosen?.code===c.code} onClick={event=>{const rect=event.currentTarget.getBoundingClientRect();setGroups({code:c.code,left:Math.max(16,Math.min(rect.right+12,window.innerWidth-376)),top:Math.max(16,Math.min(rect.top,window.innerHeight-360))});}}>›</button>}</div>
        {disabled&&<p id={reasonId} className={available===false?'course-clash':'course-checking'}>{available===false?'Course Clash':'Checking course availability…'}</p>}
      </article>;
    })}</div>
    {chosen&&groups&&createPortal(<ProjectDialog title={'Groups for '+chosen.code} className="course-groups-dialog" style={{left:`min(${groups.left}px, max(16px, calc(100vw - 376px)))`,top:groupTop,maxHeight:`calc(100dvh - ${groupTop} - 16px)`}} dismissOnBackdrop onCancel={()=>setGroups(null)}><button className="dialog-close quiet" aria-label="Close group selection" onClick={()=>setGroups(null)}>×</button><p>{chosen.name}</p><div className="class-choices">{[...new Set(chosen.classes.map(s=>s.type))].sort().map(type=>{
      const options=chosen.classes.filter(s=>s.type===type),ids=new Set(options.map(s=>s.id));const fixed=project.selection.lockedClassIds.find(id=>ids.has(id))??'';
      return <label key={type}>{typeName(type)}<select aria-label={typeName(type)+' for '+chosen.code} value={fixed} onChange={e=>onChange({...project.selection,lockedClassIds:[...project.selection.lockedClassIds.filter(id=>!ids.has(id)),...(e.target.value?[e.target.value]:[])]})}><option value="">Any group</option>{options.map(o=><option key={o.id} value={o.id}>Group {o.group} / #{o.number}</option>)}</select></label>;
    })}</div><p className="group-note">Choices update the timetable immediately.</p></ProjectDialog>,document.body)}
  </>;
}
export function SidebarIcon(){return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M5.5 8h1M5.5 12h1M5.5 16h1"/></svg>;}
