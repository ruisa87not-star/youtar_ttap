import {expect,it,vi} from 'vitest';
import {createTauriBridge} from '../../src/platform/tauri';
import {makeProject} from '../fixtures/projects';

it('returns native HTML success, cancellation and error outcomes without substituting browser I/O',async()=>{
  const results=[{status:'ok',value:[{name:'page.html',text:'<table></table>'}]},{status:'cancelled'},{status:'error',message:'Too large'}];
  const invoke=vi.fn().mockImplementation(async()=>results.shift());const bridge=createTauriBridge(invoke,async()=>()=>{});
  expect(await bridge.pickHtml()).toEqual({status:'ok',value:[{name:'page.html',text:'<table></table>'}]});
  expect(await bridge.pickHtml()).toEqual({status:'cancelled'});expect(await bridge.pickHtml()).toEqual({status:'error',message:'Too large'});
  expect(invoke.mock.calls.map(c=>c[0])).toEqual(['ttap_pick_html','ttap_pick_html','ttap_pick_html']);
});
it('validates PNG before invoking native and preserves cancellation of a real save',async()=>{
  const invoke=vi.fn().mockResolvedValue({status:'cancelled'});const bridge=createTauriBridge(invoke,async()=>()=>{});
  expect((await bridge.exportImage('data:image/png;base64,broken')).status).toBe('error');expect(invoke).not.toHaveBeenCalled();
  const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  expect(await bridge.exportImage(png)).toEqual({status:'cancelled'});expect(invoke).toHaveBeenCalledWith('ttap_export_image',{png});
});
it('encodes valid projects and rejects invalid schema before the save dialog',async()=>{
  const invoke=vi.fn().mockResolvedValue({status:'ok',value:{kind:'saved',name:'plan.ttap.json'}});const bridge=createTauriBridge(invoke,async()=>()=>{});
  const project=makeProject();await bridge.exportProject(project);expect(invoke).toHaveBeenCalledWith('ttap_export_project',{text:expect.any(String)});
  invoke.mockClear();expect((await bridge.exportProject({...project,schemaVersion:2 as 1})).status).toBe('error');expect(invoke).not.toHaveBeenCalled();
});
it('converts invoke rejection into a file error and rejects malformed native outcomes',async()=>{
  const invoke=vi.fn().mockRejectedValueOnce('native offline').mockResolvedValueOnce({secret:'unexpected'});const bridge=createTauriBridge(invoke,async()=>()=>{});
  expect((await bridge.pickHtml()).status).toBe('error');expect((await bridge.pickHtml()).status).toBe('error');
});
it('unsubscribes a late listener and suppresses its callback after cleanup',async()=>{
  let resolve!:(stop:()=>void)=>void;let handler!:()=>void;const stop=vi.fn();const close=vi.fn();
  const bridge=createTauriBridge(async()=>{},(_event,callback)=>{handler=callback;return new Promise(r=>{resolve=r;});});
  const cleanup=bridge.onCloseRequested(close);cleanup();handler();resolve(stop);await Promise.resolve();
  expect(stop).toHaveBeenCalledOnce();expect(close).not.toHaveBeenCalled();
});
it('delivers active close requests, handles rejected listen and uses exact registration commands',async()=>{
  let handler!:(payload?:unknown)=>void;const close=vi.fn(),stop=vi.fn(),invoke=vi.fn().mockResolvedValue({loading:false,error:''});
  const bridge=createTauriBridge(invoke,async(event,callback)=>{expect(event).toBe('ttap-close-requested');handler=callback;return stop;});
  const cleanup=bridge.onCloseRequested(close);await Promise.resolve();handler(7);expect(close).toHaveBeenCalledOnce();expect(invoke).toHaveBeenCalledWith('ttap_acknowledge_close',{request:7});cleanup();expect(stop).toHaveBeenCalledOnce();
  await bridge.openRegistration();await bridge.reloadRegistration();await bridge.getRegistrationStatus();await bridge.readRegistrationPage();await bridge.confirmClose();
  expect(invoke.mock.calls.map(c=>c[0])).toEqual(['ttap_acknowledge_close','ttap_open_registration','ttap_reload_registration','ttap_registration_status','ttap_read_registration','ttap_confirm_close']);
  createTauriBridge(invoke,async()=>{throw Error('listen unavailable');}).onCloseRequested(close)();await Promise.resolve();
});
it('sequences dirty and bounds messages so native code can ignore stale requests, and contains rejected sends',async()=>{
  const invoke=vi.fn().mockRejectedValue('closed');const bridge=createTauriBridge(invoke,async()=>()=>{});
  bridge.setDirty(true);bridge.setDirty(false);bridge.setRegistrationBounds({x:0,y:50,width:400,height:300});bridge.setRegistrationBounds(null);
  await Promise.resolve();await Promise.resolve();
  expect(invoke.mock.calls).toEqual([
    ['ttap_set_dirty',{dirty:true,sequence:1}],['ttap_set_dirty',{dirty:false,sequence:2}],
    ['ttap_registration_bounds',{bounds:{x:0,y:50,width:400,height:300},sequence:1}],['ttap_registration_bounds',{bounds:null,sequence:2}],
  ]);
});
