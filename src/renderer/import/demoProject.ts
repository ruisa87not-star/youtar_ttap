import type {Course,Project} from '../../shared/model';
import {parseUtarHtml} from './parseUtarHtml';
import sample from './demo.html?raw';

// Demonstration data only; course names mirror the legacy demo, times are synthetic.
const catalog=[
  ['UEMX4313','Advanced Structural Steel Design'],['MPU34072','Art, Craft, & Design'],
  ['MPU34022','Arts & Cultural Performance'],['MPU32013','Bahasa Kebangsaan A'],
  ['MPU3143','Bahasa Melayu Komunikasi 2'],['UKMM1043','Basic Economics, Accounting & Management'],
  ['UEMX2363','Concrete Structures Design II'],['UEMX4393','Concrete Technology'],
  ['UEME1252','Engineering Drawing and CAD'],['MPU32043','English for Engineering'],
  ['UEME2123','Fluid Mechanics I'],['UECS1643','Fundamentals of Programming'],
  ['UEMX2423','Geotechnical Engineering'],['UALF1003','Introduction to French'],
  ['UECM1653','Mathematics for Engineering I'],['UECM2623','Numerical Methods and Statistics'],
] as const;
export function createDemoProject():Project{
  const additional:Course[]=catalog.map(([code,name],i)=>({code,name,creditHours:code==='MPU34072'||code==='MPU34022'?2:3,
    classes:['L','T'].flatMap((type,j)=>Array.from({length:type==='L'?3:2},(_,n)=>({
      id:JSON.stringify([code,type,String(n+1),String(n+1)]),courseCode:code,type,number:String(n+1),group:String(n+1),
      meetings:[{day:(i+n+j*2)%5+1,startMinute:480+((i*2+n*3+j)%8)*60,endMinute:480+((i*2+n*3+j)%8)*60+(type==='L'?120:60),weeks:Array.from({length:14},(_,w)=>w+1),room:'KB'+(310+i)}],
    }))),
  }));
  return {schemaVersion:1,sources:['Demo — synthetic schedules, not current UTAR offerings'],courses:[...parseUtarHtml([{name:'Demo',text:sample}]).courses,...additional],selection:{courseCodes:[],lockedClassIds:[],blocked:[]}};
}
