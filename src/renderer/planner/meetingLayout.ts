import type {Course,Timetable} from '../../shared/model';

// Separate meetings that occupy the same screen time, including alternating weeks.
export function meetingLayout(courses:Course[],timetable?:Timetable){
  const ids=new Set(timetable?.classIds??[]);
  const meetings=courses.flatMap((course,tone)=>course.classes.filter(option=>ids.has(option.id)).flatMap(option=>option.meetings.map(meeting=>({course,option,meeting,tone,lane:0,lanes:1}))));
  for(let day=1;day<=7;day++){
    const rows=meetings.filter(m=>m.meeting.day===day).sort((a,b)=>a.meeting.startMinute-b.meeting.startMinute);
    const ends:number[]=[];
    for(const row of rows){let lane=ends.findIndex(end=>end<=row.meeting.startMinute);if(lane<0)lane=ends.length;ends[lane]=row.meeting.endMinute;row.lane=lane;}
    for(const row of rows)row.lanes=ends.length;
  }
  return meetings;
}
