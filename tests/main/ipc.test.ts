// @vitest-environment node
import {beforeEach,expect,it,vi} from 'vitest';
import {registerMainIpc} from '../../src/main/ipc';
import {makeProject} from '../fixtures/projects';
const mocks=vi.hoisted(()=>({handlers:new Map<string,Function>(),listeners:new Map<string,Function>(),open:vi.fn(),save:vi.fn(),write:vi.fn(),image:vi.fn(),read:vi.fn(),html:vi.fn(),external:vi.fn(),registration:{open:vi.fn(),setBounds:vi.fn(),status:vi.fn(),reload:vi.fn(),readPage:vi.fn()}}));
vi.mock('electron',()=>({ipcMain:{handle:(n:string,f:Function)=>mocks.handlers.set(n,f),on:(n:string,f:Function)=>mocks.listeners.set(n,f)},dialog:{showOpenDialog:mocks.open,showSaveDialog:mocks.save},shell:{openExternal:mocks.external}}));
vi.mock('../../src/main/files',()=>({readProjectText:mocks.read,writeProjectAtomically:mocks.write,writeImageAtomically:mocks.image,readHtmlPaths:mocks.html}));
const frame={url:'ttap://app/index.html'};const wc={mainFrame:frame};const win={webContents:wc};const hooks={setDirty:vi.fn(),confirmClose:vi.fn()};
const event={sender:wc,senderFrame:frame};
const call=(n:string,e=event,...args:unknown[])=>mocks.handlers.get('ttap:'+n)!(e,...args);
beforeEach(()=>{vi.clearAllMocks();mocks.handlers.clear();mocks.listeners.clear();frame.url='ttap://app/index.html';registerMainIpc(win as never,'ttap://app/index.html',hooks,mocks.registration);});
it('opens the integrated registration view without forwarding a supplied URL or launching a browser',async()=>{
  await call('open-registration',event,'file:///C:/unexpected.exe');expect(mocks.registration.open).toHaveBeenCalledExactlyOnceWith();expect(mocks.external).not.toHaveBeenCalled();
});
it('rejects registration requests from a subframe before opening a browser',async()=>{
  await expect(call('open-registration',{...event,senderFrame:{...frame}})).rejects.toThrow(/sender/i);expect(mocks.external).not.toHaveBeenCalled();
});
it('returns cancellation from native dialogs without reading or writing',async()=>{
  mocks.open.mockResolvedValue({canceled:true,filePaths:[]});mocks.save.mockResolvedValue({canceled:true});
  expect(await call('open-project')).toEqual({status:'cancelled'});expect(await call('pick-html')).toEqual({status:'cancelled'});expect(await call('export-project',event,makeProject())).toEqual({status:'cancelled'});expect(mocks.write).not.toHaveBeenCalled();expect(hooks.setDirty).not.toHaveBeenCalled();
});
it('uses paths only from the native dialog and returns project text',async()=>{
  mocks.open.mockResolvedValue({canceled:false,filePaths:['chosen.json']});mocks.read.mockResolvedValue({name:'chosen.json',text:'{}'});
  expect(await call('open-project',event,'attacker-path')).toEqual({status:'ok',value:{name:'chosen.json',text:'{}'}});expect(mocks.read).toHaveBeenCalledWith('chosen.json');
});
it('rejects another renderer, a subframe and an unknown URL',async()=>{
  await expect(call('open-project',{...event,sender:{} as typeof wc})).rejects.toThrow(/sender/i);
  await expect(call('open-project',{...event,senderFrame:{...frame}})).rejects.toThrow(/sender/i);
  frame.url='https://attacker.example/';await expect(call('open-project')).rejects.toThrow(/sender/i);expect(mocks.open).not.toHaveBeenCalled();
});
it('rejects an invalid payload before opening a save dialog',async()=>{
  expect((await call('export-project',event,{schemaVersion:1})).status).toBe('error');expect(mocks.save).not.toHaveBeenCalled();
});
it('does not report success when an atomic write fails',async()=>{
  mocks.save.mockResolvedValue({canceled:false,filePath:'chosen.json'});mocks.write.mockRejectedValue(new Error('disk full'));
  expect((await call('export-project',event,makeProject())).status).toBe('error');expect(hooks.setDirty).not.toHaveBeenCalled();
});
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
it('saves PNG bytes only to the native chosen path, and supports cancellation',async()=>{
  mocks.save.mockResolvedValue({canceled:true});expect(await call('export-image',event,png)).toEqual({status:'cancelled'});expect(mocks.image).not.toHaveBeenCalled();
  mocks.save.mockResolvedValue({canceled:false,filePath:'chosen.png'});
  expect(await call('export-image',event,png)).toEqual({status:'ok',value:{kind:'saved',name:'chosen.png'}});
  expect(mocks.image).toHaveBeenCalledWith('chosen.png',expect.any(Uint8Array));
});
it('rejects malformed, oversized and untrusted image requests before opening a dialog',async()=>{
  for(const input of [null,'file:///private.png','data:image/png;base64,PGh0bWw+', 'data:image/png;base64,'+'A'.repeat(15_000_000)])expect((await call('export-image',event,input)).status).toBe('error');
  await expect(call('export-image',{...event,senderFrame:{...frame}},png)).rejects.toThrow(/sender/i);
  expect(mocks.save).not.toHaveBeenCalled();expect(mocks.image).not.toHaveBeenCalled();
});
