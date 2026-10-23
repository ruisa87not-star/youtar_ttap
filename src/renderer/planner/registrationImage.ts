import type {Project,Timetable} from '../../shared/model';
import {meetingsClash,periodsOverlap} from '../../core/clashes';
import {dayNames,formatTime} from './ConstraintsPanel';
import {typeName} from './CourseList';
import {meetingLayout} from './meetingLayout';

export function renderRegistrationImage(project:Project,timetable:Timetable):string{
  const selected=project.courses.filter(c=>project.selection.courseCodes.includes(c.code));
  const ids=new Set(timetable.classIds);
  const options=selected.flatMap(course=>course.classes.filter(o=>ids.has(o.id)));
  if(!selected.length||options.length!==ids.size||ids.size!==timetable.classIds.length||project.selection.lockedClassIds.some(id=>!ids.has(id))||selected.some(c=>[...new Set(c.classes.map(o=>o.type))].some(type=>c.classes.filter(o=>o.type===type&&ids.has(o.id)).length!==1)))throw new Error('Choose a complete, current timetable before exporting.');
  const meetings=meetingLayout(project.courses,timetable);
  if(meetings.some((a,i)=>project.selection.blocked.some(b=>periodsOverlap(a.meeting,b))||meetings.slice(i+1).some(b=>meetingsClash(a.meeting,b.meeting))))throw new Error('Resolve timetable clashes before exporting.');
  const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Image export is unavailable in this browser.');
  const width=1600,pad=64,line=30,content=width-pad*2;
  function wrap(text:string,max:number){const lines:string[]=[];let current='';for(const char of text){if(current&&ctx!.measureText(current+char).width>max){lines.push(current.trimEnd());current='';}current+=char;}if(current)lines.push(current);return lines.length?lines:[''];}
  ctx.font='24px Arial, sans-serif';
  const cards=selected.map(course=>({course,lines:[...wrap(`${course.code}  ${course.name}`,content-40),`Credit hours: ${course.creditHours??'Unknown'}`,...course.classes.filter(o=>ids.has(o.id)).flatMap(o=>[...wrap(`${typeName(o.type)}: group ${o.group} / class #${o.number}`,content-40),...o.meetings.flatMap(m=>wrap(`${dayNames[m.day-1]} ${formatTime(m.startMinute)}–${formatTime(m.endMinute)}  |  ${m.room||'Room not specified'}  |  Weeks ${m.weeks.join(', ')}`,content-64)),...(o.remark?wrap(`Note: ${o.remark}`,content-64):[])])]}));
  const lanes=dayNames.map((_,i)=>Math.max(1,...meetings.filter(m=>m.meeting.day===i+1).map(m=>m.lanes)));
  const rowHeights=lanes.map(n=>Math.max(94,n*64));
  const gridHeight=rowHeights.reduce((sum,n)=>sum+n,0);
  const height=500+gridHeight+cards.reduce((sum,c)=>sum+c.lines.length*line+48,0)+110;
  if(height>15000||width*height>24_000_000)throw new Error('Too many class details for one image. Select fewer courses and try again.');
  canvas.width=width;canvas.height=height;
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.fillStyle='#142d50';ctx.font='bold 44px Arial, sans-serif';ctx.fillText('youtar_ttap / Your registration guide',pad,85);
  ctx.font='24px Arial, sans-serif';ctx.fillStyle='#435a75';
  ['1. Sign in to the UTAR Course Registration System.','2. Find each course below and select the matching lecture, tutorial and practical groups.','3. Confirm availability and registration in UTAR. This image is your planning reference.'].forEach((text,i)=>ctx.fillText(text,pad,140+i*38));
  const first=Math.floor(Math.min(480,...meetings.map(m=>m.meeting.startMinute))/60)*60;
  const last=Math.ceil(Math.max(1080,...meetings.map(m=>m.meeting.endMinute))/60)*60;
  const x0=pad+96,gridWidth=content-112, x=(minute:number)=>x0+(minute-first)/(last-first)*gridWidth;
  ctx.font='bold 28px Arial, sans-serif';ctx.fillStyle='#142d50';ctx.fillText('Weekly timetable / all meetings',pad,290);
  ctx.font='22px Arial, sans-serif';ctx.textAlign='center';for(let t=first;t<=last;t+=60)ctx.fillText(formatTime(t),x(t),333);ctx.textAlign='left';
  const colors=['#e9f0ff','#fff3d4','#e1f4ec','#faeaf1','#f0ebfa','#f7ebdf'];let y=352;
  dayNames.forEach((day,i)=>{
    const rowHeight=rowHeights[i];ctx.fillStyle=i%2?'#f6f8fc':'#ffffff';ctx.fillRect(pad,y,content,rowHeight);ctx.font='bold 24px Arial, sans-serif';ctx.fillStyle='#142d50';ctx.fillText(day.slice(0,3),pad+12,y+36);
    ctx.strokeStyle='#d5dfed';for(let t=first;t<=last;t+=60)ctx.strokeRect(x(t),y,0,rowHeight);
    for(const b of project.selection.blocked.filter(b=>b.day===i+1&&b.endMinute>first&&b.startMinute<last)){const start=Math.max(first,b.startMinute),end=Math.min(last,b.endMinute);ctx.fillStyle='#e8ebef';ctx.fillRect(x(start),y,x(end)-x(start),rowHeight);}
    for(const m of meetings.filter(m=>m.meeting.day===i+1)){
      const left=x(m.meeting.startMinute),top=y+m.lane/lanes[i]*rowHeight+3,w=x(m.meeting.endMinute)-left,h=rowHeight/lanes[i]-6;
      ctx.fillStyle=colors[m.tone%6];ctx.fillRect(left+2,top,w-4,h);ctx.save();ctx.beginPath();ctx.rect(left+5,top,w-10,h);ctx.clip();ctx.fillStyle='#173455';ctx.font='bold 20px Arial, sans-serif';ctx.fillText(m.course.code,left+8,top+24);ctx.font='18px Arial, sans-serif';ctx.fillText(`${m.option.type}(${m.option.group}) ${formatTime(m.meeting.startMinute)}`,left+8,top+48);ctx.restore();
    }
    y+=rowHeight;
  });
  y+=48;ctx.fillStyle='#142d50';ctx.font='bold 28px Arial, sans-serif';ctx.fillText('Courses and groups to select',pad,y);y+=28;
  for(const card of cards){ctx.fillStyle='#f3f6fb';ctx.fillRect(pad,y,content,card.lines.length*line+28);ctx.fillStyle='#142d50';ctx.font='24px Arial, sans-serif';card.lines.forEach((text,i)=>ctx.fillText(text,pad+20,y+30+i*line));y+=card.lines.length*line+48;}
  const total=selected.some(c=>c.creditHours===undefined)?'Unknown':selected.reduce((sum,c)=>sum+(c.creditHours??0),0);
  ctx.font='bold 26px Arial, sans-serif';ctx.fillStyle='#142d50';ctx.fillText(`Total credit hours: ${total}`,pad,y+28);
  return canvas.toDataURL('image/png');
}
