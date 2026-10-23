import {expect,it,vi} from 'vitest';
import {createElectronFilePort} from '../../src/platform/electron';
import {makeProject} from '../fixtures/projects';
it('adapts only the three narrow file capabilities and preserves cancellation',async()=>{
  const bridge={pickHtml:vi.fn().mockResolvedValue({status:'cancelled'}),openProject:vi.fn().mockResolvedValue({status:'cancelled'}),exportProject:vi.fn().mockResolvedValue({status:'cancelled'})};
  const port=createElectronFilePort(bridge as never);expect(await port.pickHtml()).toEqual({status:'cancelled'});expect(await port.openProject()).toEqual({status:'cancelled'});expect(await port.exportProject(makeProject())).toEqual({status:'cancelled'});expect(bridge.exportProject).toHaveBeenCalledWith(makeProject());
});
