import {useState} from 'react';
import type {BlockedPeriod,Course,Timetable} from '../../shared/model';
import {dayNames,formatTime} from './ConstraintsPanel';
import {typeName} from './CourseList';
import {meetingLayout} from './meetingLayout';
export function TimetableView({courses,timetable,blocked=[]}:{courses:Course[];timetable?:Timetable;blocked?:BlockedPeriod[]}){
  const[detail,setDetail]=useState<string|null>(null);const ids=new Set(timetable?.classIds??[]);
  const options=courses.flatMap((course,tone)=>course.classes.filter(c=>ids.has(c.id)).map(option=>({course,option,tone})));
  const meetings=meetingLayout(courses,timetable);
  const minimumRows=dayNames.map((_,i)=>{const lanes=Math.max(1,...meetings.filter(m=>m.meeting.day===i+1).map(m=>m.lanes));return lanes===1?18:lanes*32+1;});
  const first=Math.floor(Math.min(480,...meetings.map(m=>m.meeting.startMinute))/60)*60;
  const last=Math.ceil(Math.max(1080,...meetings.map(m=>m.meeting.endMinute))/60)*60;
  const hours=Array.from({length:(last-first)/60+1},(_,n)=>first+n*60);
  const left=(minute:number)=>`${(minute-first)/(last-first)*100}%`;
  const position=(start:number,end:number)=>({left:left(start),width:`${(end-start)/(last-first)*100}%`});
  const details=options.find(o=>o.option.id===detail);
  return <section aria-label="Weekly timetable" className="weekly-timetable">
      <div className="calendar-scroll"><div className="calendar"><div className="calendar-head"><span>Day</span><div className="time-axis">{hours.map(t=><time key={t} aria-label={formatTime(t)} dateTime={formatTime(t)} style={{left:left(t)}}><span className="hour-full">{formatTime(t)}</span><span className="hour-short" aria-hidden="true">{formatTime(t).slice(0,2)}</span></time>)}</div></div><div className="calendar-body" style={{gridTemplateRows:minimumRows.map(height=>`minmax(${height}px, 1fr)`).join(' '),minHeight:minimumRows.reduce((sum,h)=>sum+h,0)}}>
        {dayNames.map((day,i)=><section className="day-row" aria-label={day} key={day}><b className="day-label">{day.slice(0,3)}</b><div className="day-track">
          {hours.slice(0,-1).map(t=><div className="hour-rule" key={t} style={{left:left(t)}}/>)}
          {blocked.filter(b=>b.day===i+1&&b.endMinute>first&&b.startMinute<last).map((b,n)=><div className="blocked-block" key={'blocked'+n} style={position(Math.max(first,b.startMinute),Math.min(last,b.endMinute))}>Unavailable</div>)}
          {meetings.filter(m=>m.meeting.day===i+1).map(({course,option,meeting,tone,lane,lanes},n)=><button key={option.id+'-'+n} className={'meeting tone-'+tone%6} style={{...position(meeting.startMinute,meeting.endMinute),top:`calc(${lane/lanes*100}% + 2px)`,height:`calc(${100/lanes}% - 4px)`}} onClick={()=>setDetail(option.id)} aria-expanded={detail===option.id} aria-label={`${course.code} ${course.name}, ${typeName(option.type)} group ${option.group}, ${formatTime(meeting.startMinute)} to ${formatTime(meeting.endMinute)}, ${meeting.room}`}><strong>{course.code}</strong><span>{option.type}{option.group} · {formatTime(meeting.startMinute)}</span>{meeting.endMinute-meeting.startMinute>=60&&<small>{meeting.room}</small>}</button>)}
        </div></section>)}</div></div></div>
      {details&&<div className="class-details"><div><h3>{details.course.code} / {typeName(details.option.type)} group {details.option.group}</h3><button className="quiet" onClick={()=>setDetail(null)}>Close details</button></div><p>{details.course.name}</p><ul>{details.option.meetings.map((m,i)=><li key={i}>{dayNames[m.day-1]} {formatTime(m.startMinute)}–{formatTime(m.endMinute)} / {m.room||'Room not specified'} / Weeks {m.weeks.join(', ')}</li>)}</ul>{details.option.remark&&<p>{details.option.remark}</p>}</div>}
  </section>;
}
