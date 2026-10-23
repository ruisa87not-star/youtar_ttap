import type {SolveInput,SolveResult} from '../shared/model';
export class SolverClient {
  private nextId=0;
  private pending?:{id:number;worker:Worker;reject:(reason:unknown)=>void};
  solve(input:SolveInput):Promise<SolveResult>{
    return this.request<SolveResult>(input,'solve');
  }
  availability(input:SolveInput):Promise<Record<string,boolean>>{return this.request(input,'availability');}
  private request<T>(input:SolveInput,operation:'solve'|'availability'):Promise<T>{
    this.cancel(); const id=++this.nextId;
    return new Promise((resolve,reject)=>{
      // https://vite.dev/guide/features.html#web-workers
      const worker=new Worker(new URL('./solver.worker.ts',import.meta.url),{type:'module'});
      this.pending={id,worker,reject};
      const finish=()=>{worker.terminate();if(this.pending?.id===id)this.pending=undefined;};
      worker.onmessage=event=>{
        if(this.pending?.id!==id || event.data.requestId!==id)return;
        finish();
        if(typeof event.data.error==='string')reject(new Error(event.data.error));else resolve(event.data.result);
      };
      worker.onerror=()=>{if(this.pending?.id!==id)return;finish();reject(new Error('The timetable check could not finish. Change a course or try Retry check.'));};
      worker.postMessage({requestId:id,input,operation});
    });
  }
  cancel():void{
    const pending=this.pending;this.pending=undefined;
    if(pending){pending.worker.terminate();pending.reject(new DOMException('Search cancelled','AbortError'));}
  }
  dispose():void{this.cancel();}
}
