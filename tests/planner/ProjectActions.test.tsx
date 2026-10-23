import {act,render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach,expect,it,vi} from 'vitest';
import {App} from '../../src/renderer/App';
import {courseAvailability} from '../../src/core/courseAvailability';
import {solveTimetables} from '../../src/core/solveTimetables';
vi.mock('../../src/workers/SolverClient',()=>({SolverClient:class {solve=async(input:Parameters<typeof solveTimetables>[0])=>solveTimetables(input);availability=async(input:Parameters<typeof solveTimetables>[0])=>courseAvailability(input);cancel(){}dispose(){}}}));
vi.mock('../../src/renderer/planner/registrationImage',()=>({renderRegistrationImage:()=> 'data:image/png;base64,example'}));
const port=vi.hoisted(()=>({pickHtml:vi.fn(),exportImage:vi.fn()}));
vi.mock('../../src/platform/files',()=>({getFilePort:()=>port}));
beforeEach(()=>{vi.clearAllMocks();port.exportImage.mockResolvedValue({status:'cancelled'});});
async function demo(){render(<App/>);await userEvent.click(screen.getByRole('button',{name:'Skip tutorial'}));await userEvent.click(screen.getByRole('button',{name:'Try demo'}));await userEvent.click(screen.getByRole('checkbox',{name:'TEST2023 DATA STRUCTURES'}));await screen.findByText('No clashes. Your selected courses fit together.');}
async function replaceDemo(){await userEvent.click(screen.getByRole('link',{name:'youtar_ttap UTAR timetable planner'}));await userEvent.click(screen.getByRole('button',{name:'Try demo'}));return screen.findByRole('dialog',{name:'Keep your changes?'});}
it('places image export in the planner actions without a project toolbar or Generate action',async()=>{
  await demo();const button=screen.getByRole('button',{name:'Export image'});expect(button.closest('.planner-actions')).not.toBeNull();
  for(const name of ['Open project','Import courses','Generate','Hide courses'])expect(screen.queryByRole('button',{name})).toBeNull();
  expect(document.querySelector('.project-bar')).toBeNull();
});
it('does not replace dirty work when image export is cancelled',async()=>{
  await demo();const dialog=await replaceDemo();await userEvent.click(within(dialog).getByRole('button',{name:'Export and continue'}));expect(dialog).toBeInTheDocument();
  await userEvent.click(within(dialog).getByRole('button',{name:'Cancel'}));await userEvent.click(screen.getByRole('button',{name:'Back to planner'}));expect(screen.getByRole('checkbox',{name:'TEST2023 DATA STRUCTURES'})).toBeChecked();
});
it('requires confirmation of a kept download before clearing dirty state',async()=>{
  await demo();port.exportImage.mockResolvedValue({status:'ok',value:{kind:'downloaded',name:'test.png'}});
  const before=new Event('beforeunload',{cancelable:true});window.dispatchEvent(before);expect(before.defaultPrevented).toBe(true);
  await userEvent.click(screen.getByRole('button',{name:'Export image'}));expect(await screen.findByRole('dialog',{name:'Keep your download'})).toBeInTheDocument();expect(screen.getByText('Image not exported')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button',{name:'I kept the file'}));expect(screen.getByText('Image exported')).toBeInTheDocument();
  const after=new Event('beforeunload',{cancelable:true});window.dispatchEvent(after);expect(after.defaultPrevented).toBe(false);
});
it('does not clear edits made while an asynchronous image save is in progress',async()=>{
  let finish!:(value:unknown)=>void;await demo();port.exportImage.mockImplementation(()=>new Promise(resolve=>finish=resolve));
  await userEvent.click(screen.getByRole('button',{name:'Export image'}));await userEvent.click(screen.getByRole('checkbox',{name:'TEST2023 DATA STRUCTURES'}));
  await act(async()=>finish({status:'ok',value:{kind:'saved',name:'test.png'}}));expect(screen.getByText('Image not exported')).toBeInTheDocument();
});
it('replaces a dirty plan only after explicit discard',async()=>{
  await demo();await replaceDemo();await userEvent.click(screen.getByRole('button',{name:'Discard changes'}));expect(screen.getByRole('checkbox',{name:'TEST2023 DATA STRUCTURES'})).not.toBeChecked();
});
it('marks a different timetable option as unexported and disables export with no courses',async()=>{
  render(<App/>);await userEvent.click(screen.getByRole('button',{name:'Skip tutorial'}));await userEvent.click(screen.getByRole('button',{name:'Try demo'}));
  expect(screen.getByRole('button',{name:'Export image'})).toBeDisabled();
  await userEvent.click(screen.getByRole('checkbox',{name:'TEST1013 COMPUTING & SOCIETY'}));await screen.findByText('Option 1 of 2');
  port.exportImage.mockResolvedValue({status:'ok',value:{kind:'saved',name:'current.png'}});await userEvent.click(screen.getByRole('button',{name:'Export image'}));expect(screen.getByText('Image exported')).toBeVisible();
  await userEvent.click(screen.getByRole('button',{name:'Next timetable'}));expect(screen.getByText('Image not exported')).toBeVisible();
  await userEvent.click(screen.getByRole('checkbox',{name:'TEST1013 COMPUTING & SOCIETY'}));expect(screen.getByRole('button',{name:'Export image'})).toBeDisabled();
});
it('preserves dirty work and exposes a failed image save',async()=>{
  await demo();port.exportImage.mockResolvedValue({status:'error',message:'Disk full. Choose another folder.'});await userEvent.click(screen.getByRole('button',{name:'Export image'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Disk full');expect(screen.getByText('Image not exported')).toBeVisible();expect(screen.getByRole('checkbox',{name:'TEST2023 DATA STRUCTURES'})).toBeChecked();
});
