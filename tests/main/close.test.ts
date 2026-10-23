// @vitest-environment node
import {EventEmitter} from 'node:events';
import {expect,it,vi} from 'vitest';
import {installCloseGuard} from '../../src/main/close';
const native=vi.hoisted(()=>vi.fn());vi.mock('electron',()=>({dialog:{showMessageBox:native}}));
function fixture(){const window=new EventEmitter() as EventEmitter&{webContents:EventEmitter&{send:ReturnType<typeof vi.fn>};close:ReturnType<typeof vi.fn>};window.webContents=Object.assign(new EventEmitter(),{send:vi.fn()});window.close=vi.fn();const guard=installCloseGuard(window as never);return {window,guard};}
it('allows a clean close and requests a renderer decision for dirty work',()=>{
  const {window,guard}=fixture();const preventDefault=vi.fn();window.emit('close',{preventDefault});expect(preventDefault).not.toHaveBeenCalled();
  guard.setDirty(true);window.emit('close',{preventDefault});expect(preventDefault).toHaveBeenCalledOnce();expect(window.webContents.send).toHaveBeenCalledWith('ttap:close-requested');
  guard.confirmClose();expect(window.close).toHaveBeenCalledOnce();preventDefault.mockClear();window.emit('close',{preventDefault});expect(preventDefault).not.toHaveBeenCalled();
});
it('offers a native fallback when a dirty renderer crashes',async()=>{
  const {window,guard}=fixture();guard.setDirty(true);window.webContents.emit('render-process-gone');native.mockResolvedValue({response:1});window.emit('close',{preventDefault:vi.fn()});await vi.waitFor(()=>expect(window.close).toHaveBeenCalledOnce());
});
