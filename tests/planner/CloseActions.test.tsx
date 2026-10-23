import {act,render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,expect,it,vi} from 'vitest';
import {courseAvailability} from '../../src/core/courseAvailability';
import {solveTimetables} from '../../src/core/solveTimetables';
vi.mock('../../src/workers/SolverClient',()=>({SolverClient:class {solve=async(input:Parameters<typeof solveTimetables>[0])=>solveTimetables(input);availability=async(input:Parameters<typeof solveTimetables>[0])=>courseAvailability(input);cancel(){}dispose(){}}}));
vi.mock('../../src/renderer/planner/registrationImage',()=>({renderRegistrationImage:()=> 'data:image/png;base64,example'}));
import {App} from '../../src/renderer/App';
afterEach(()=>{delete window.ttap;});
it('keeps a dirty desktop open when saving is cancelled, then closes after explicit discard',async()=>{
  let request!:()=>void;const confirmClose=vi.fn().mockResolvedValue(undefined);
  window.ttap={openRegistration:vi.fn().mockResolvedValue(undefined),setRegistrationBounds:vi.fn(),getRegistrationStatus:vi.fn().mockResolvedValue({loading:false,error:''}),reloadRegistration:vi.fn(),readRegistrationPage:vi.fn(),pickHtml:vi.fn(),openProject:vi.fn(),exportImage:vi.fn().mockResolvedValue({status:'cancelled'}),exportProject:vi.fn().mockResolvedValue({status:'cancelled'}),setDirty:vi.fn(),onCloseRequested:handler=>{request=handler;return ()=>{};},confirmClose};
  render(<App/>);await userEvent.click(screen.getByRole('button',{name:'Skip tutorial'}));await userEvent.click(screen.getByRole('button',{name:'Try demo'}));await userEvent.click(screen.getByRole('checkbox',{name:'TEST1013 COMPUTING & SOCIETY'}));await screen.findByText('No clashes. Your selected courses fit together.');
  act(()=>request());const dialog=await screen.findByRole('dialog',{name:'Keep your changes?'});await userEvent.click(within(dialog).getByRole('button',{name:'Export and continue'}));expect(confirmClose).not.toHaveBeenCalled();expect(dialog).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole('button',{name:'Discard changes'}));expect(confirmClose).toHaveBeenCalledOnce();
});
