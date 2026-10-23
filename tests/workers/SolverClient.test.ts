import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {SolverClient} from '../../src/workers/SolverClient';
import {makeSolveInput} from '../fixtures/solver';
class WorkerDouble {
  static all:WorkerDouble[]=[]; onmessage:((event:MessageEvent)=>void)|null=null; onerror:((event:ErrorEvent)=>void)|null=null;
  postMessage=vi.fn(); terminate=vi.fn(); constructor(){WorkerDouble.all.push(this);}
  reply(data:unknown){this.onmessage?.({data} as MessageEvent);}
}
beforeEach(()=>{WorkerDouble.all=[];vi.stubGlobal('Worker',WorkerDouble);});
afterEach(()=>vi.unstubAllGlobals());
it('runs the worker and resolves its matching response',async()=>{
  const client=new SolverClient();const pending=client.solve(makeSolveInput());expect(WorkerDouble.all).toHaveLength(1);
  const w=WorkerDouble.all[0];const id=w.postMessage.mock.calls[0][0].requestId;
  const result={solutions:[{classIds:['example']}],truncated:false};w.reply({requestId:id,result});
  expect(await pending).toEqual(result);expect(w.terminate).toHaveBeenCalledOnce();
});
it('cancels, recreates the worker and ignores an old response',async()=>{
  const client=new SolverClient();const first=client.solve(makeSolveInput());expect(WorkerDouble.all).toHaveLength(1);
  const old=WorkerDouble.all[0];const aborted=expect(first).rejects.toMatchObject({name:'AbortError'});client.cancel();await aborted;
  const second=client.solve(makeSolveInput());expect(WorkerDouble.all).toHaveLength(2);
  const current=WorkerDouble.all[1];let settled=false;second.then(()=>settled=true);
  old.reply({requestId:old.postMessage.mock.calls[0][0].requestId,result:{solutions:[],truncated:true}});await Promise.resolve();expect(settled).toBe(false);
  const result={solutions:[],truncated:false};current.reply({requestId:current.postMessage.mock.calls[0][0].requestId,result});expect(await second).toEqual(result);
});
it('rejects reported errors and dispose aborts an outstanding request',async()=>{
  const client=new SolverClient();const first=client.solve(makeSolveInput());expect(WorkerDouble.all).toHaveLength(1);
  const failure=expect(first).rejects.toThrow('Invalid courses');const w=WorkerDouble.all[0];w.reply({requestId:w.postMessage.mock.calls[0][0].requestId,error:'Invalid courses'});await failure;
  const second=client.solve(makeSolveInput());const aborted=expect(second).rejects.toMatchObject({name:'AbortError'});client.dispose();await aborted;
});
