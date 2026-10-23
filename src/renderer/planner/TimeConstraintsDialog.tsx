import {useMemo,useState} from 'react';
import type {BlockedPeriod,Course,Timetable} from '../../shared/model';
import {ProjectDialog} from '../ProjectActions';
import {dayNames,formatTime} from './ConstraintsPanel';

export function TimeConstraintsDialog({courses,timetables,blocked,onApply,onCancel}:{courses:Course[];timetables:Timetable[];blocked:BlockedPeriod[];onApply:(blocked:BlockedPeriod[])=>void;onCancel:()=>void}){
  const[draft,setDraft]=useState(blocked);
  const options=useMemo(()=>{const byId=new Map(courses.flatMap(c=>c.classes.map(o=>[o.id,o] as const)));return timetables.map(t=>t.classIds.flatMap(id=>byId.get(id)?.meetings??[]));},[courses,timetables]);
  const overlaps=(a:{day:number;startMinute:number;endMinute:number},b:{day:number;startMinute:number;endMinute:number})=>a.day===b.day&&a.startMinute<b.endMinute&&b.startMinute<a.endMinute;
  const remaining=options.filter(meetings=>!meetings.some(m=>draft.some(b=>overlaps(m,b)))).length;
  function toggle(day:number,startMinute:number){
    const slot={day,startMinute,endMinute:startMinute+30};
    setDraft(previous=>previous.some(b=>overlaps(b,slot))?previous.flatMap(b=>!overlaps(b,slot)?[b]:[
      ...(b.startMinute<startMinute?[{...b,endMinute:startMinute}]:[]),
      ...(b.endMinute>slot.endMinute?[{...b,startMinute:slot.endMinute}]:[]),
    ]):[...previous,slot]);
  }
  return <ProjectDialog title="Set time constraint" className="time-constraints-dialog" dismissOnBackdrop onCancel={onCancel}>
    <p>Click a half-hour cell to mark it unavailable. These constraints apply across all teaching weeks.</p>
    <div className="constraint-legend"><span className="always">Every shown option</span><span className="sometimes">Some shown options</span><span className="free">No shown classes</span><span className="blocked">Unavailable</span></div>
    <div className="constraint-grid-scroll"><div className="constraint-grid"><span>Day</span>{Array.from({length:10},(_,i)=><b className="constraint-hour" key={i}>{formatTime(480+i*60).slice(0,2)}–{formatTime(540+i*60).slice(0,2)}</b>)}
      {dayNames.map((day,index)=><div className="constraint-grid-row" key={day}><b>{day.slice(0,3)}</b>{Array.from({length:20},(_,i)=>{
        const slot={day:index+1,startMinute:480+i*30,endMinute:510+i*30};const selected=draft.some(b=>overlaps(b,slot));const count=options.filter(meetings=>meetings.some(m=>overlaps(m,slot))).length;
        const state=selected?'blocked':count===0?'free':count===options.length?'always':'sometimes';
        return <button key={i} className={'time-cell '+state} aria-pressed={selected} aria-label={`${day} ${formatTime(slot.startMinute)}–${formatTime(slot.endMinute)}`} title={`${count} of ${options.length} shown options have a class here`} onClick={()=>toggle(slot.day,slot.startMinute)}/>;
      })}</div>)}
    </div></div>
    <p role="status">{remaining} of {options.length} shown options remain.{options.length===0?' Select courses to compare timetable options.':''}</p>
    <p className="constraint-note">Apply to check your updated constraints automatically. The preview counts only the options currently shown.</p>
    <div className="actions"><button onClick={onCancel}>Cancel</button><button className="primary" onClick={()=>onApply(draft)}>Apply constraints</button></div>
  </ProjectDialog>;
}
