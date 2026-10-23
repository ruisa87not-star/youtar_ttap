import {afterEach,expect,it,vi} from 'vitest';
import {browserFilePort} from '../../src/platform/browser';
import {decodeProject} from '../../src/shared/project';
import {makeProject} from '../fixtures/projects';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('opens project text through the standard file picker and releases the input',async()=>{
  vi.spyOn(HTMLInputElement.prototype,'click').mockImplementation(function(this:HTMLInputElement){Object.defineProperty(this,'files',{value:[new File([JSON.stringify(makeProject())],'sample.ttap.json')]});this.dispatchEvent(new Event('change'));});
  const result=await browserFilePort.openProject();expect(result.status).toBe('ok');
  if(result.status!=='ok')throw new Error('Expected file selection');
  expect(decodeProject(result.value.text)).toEqual({ok:true,value:makeProject()});expect(document.querySelector('input[type=file]')).toBeNull();
});
it('handles picker cancellation without leaving a pending input',async()=>{
  vi.spyOn(HTMLInputElement.prototype,'click').mockImplementation(function(this:HTMLInputElement){this.dispatchEvent(new Event('cancel'));});
  expect(await browserFilePort.openProject()).toEqual({status:'cancelled'});expect(document.querySelector('input[type=file]')).toBeNull();
});
it('exports actual JSON with a download receipt, and releases the Blob URL later',async()=>{
  let blob!:Blob;const create=vi.fn((value:Blob)=>{blob=value;return 'blob:test';});const revoke=vi.fn();
  vi.stubGlobal('URL',class extends URL{static createObjectURL=create;static revokeObjectURL=revoke;});
  vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});vi.useFakeTimers();
  const result=await browserFilePort.exportProject(makeProject());expect(result.status).toBe('ok');expect(result.status==='ok'&&result.value.kind).toBe('downloaded');expect(create).toHaveBeenCalledOnce();expect(revoke).not.toHaveBeenCalled();
  vi.runAllTimers();expect(revoke).toHaveBeenCalledWith('blob:test');vi.useRealTimers();
  const text=await new Promise<string>(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result as string);r.readAsText(blob);});expect(decodeProject(text)).toEqual({ok:true,value:makeProject()});
});
it('rejects an invalid project before creating any download',async()=>{
  const p=makeProject();p.selection.courseCodes=['missing'];expect((await browserFilePort.exportProject(p)).status).toBe('error');
});
