import {solveTimetables} from '../core/solveTimetables';
import {courseAvailability} from '../core/courseAvailability';
import type {SolveInput} from '../shared/model';
self.onmessage=(event:MessageEvent<{requestId:number;input:SolveInput;operation?:'solve'|'availability'}>)=>{
  const {requestId,input,operation}=event.data;
  try{self.postMessage({requestId,result:operation==='availability'?courseAvailability(input):solveTimetables(input)});}
  catch(error){self.postMessage({requestId,error:error instanceof Error?error.message:'The timetable search failed.'});}
};
