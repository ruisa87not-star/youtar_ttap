import {useState} from 'react';
import type {Selection} from '../../shared/model';
export const dayNames=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export const formatTime=(minute:number)=>String(Math.floor(minute/60)).padStart(2,'0')+':'+String(minute%60).padStart(2,'0');
export function ConstraintsPanel({selection,onChange}:{selection:Selection;onChange:(s:Selection)=>void}){
  const[day,setDay]=useState(1);const[start,setStart]=useState('09:00');const[end,setEnd]=useState('10:00');const[error,setError]=useState('');
  function add(){
    const toMinutes=(s:string)=>{const[h,m]=s.split(':').map(Number);return h*60+m;};
    const a=toMinutes(start),b=toMinutes(end);
    if(!start||!end||!Number.isInteger(a)||!Number.isInteger(b)||a<0||b>1440||a>=b){setError('Choose an end time after the start time.');return;}
    setError('');onChange({...selection,blocked:[...selection.blocked,{day,startMinute:a,endMinute:b}]});
  }
  return <><div className="panel-heading"><h2>Make room</h2></div><p className="panel-description">Keep time for your commute, lunch, or anything else. These times apply every week.</p>
    <div className="constraint-form"><label>Day<select value={day} onChange={e=>setDay(Number(e.target.value))}>{dayNames.map((d,i)=><option value={i+1} key={d}>{d}</option>)}</select></label><div className="time-pair"><label>From<input type="time" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Until<input type="time" value={end} onChange={e=>setEnd(e.target.value)}/></label></div><button onClick={add}>Add unavailable time</button></div>
    {error&&<p role="alert" className="error">{error}</p>}
    <ul className="blocked-list">{selection.blocked.map((b,i)=><li key={i}><div><b>{dayNames[b.day-1]}</b><span>{formatTime(b.startMinute)}–{formatTime(b.endMinute)}</span></div><button className="quiet" aria-label={'Remove unavailable time '+(i+1)} onClick={()=>onChange({...selection,blocked:selection.blocked.filter((_,n)=>n!==i)})}>×</button></li>)}</ul>
  </>;
}
