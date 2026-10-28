import {act,render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach,expect,it,vi} from 'vitest';
import {RegistrationScreen} from '../../src/renderer/registration/RegistrationScreen';
import type {FileOutcome,HtmlSource} from '../../src/shared/model';
afterEach(()=>{delete window.ttap;});
it('offers compact and full browser views without replacing the official iframe',async()=>{
  render(<RegistrationScreen onSource={vi.fn()} suspended={false}/>);
  expect(screen.getByText(/Full Web login requires the registration proxy/)).toBeVisible();
  const frame=screen.getByTitle('UTAR Course Registration System');
  expect(frame).toHaveAttribute('scrolling','no');
  await userEvent.click(screen.getByRole('button',{name:'Show full page'}));
  expect(screen.getByTitle('UTAR Course Registration System')).toBe(frame);expect(frame).toHaveAttribute('scrolling','auto');
  await userEvent.click(screen.getByRole('button',{name:'Compact login'}));expect(frame).toHaveAttribute('scrolling','no');
  expect(screen.queryByRole('button',{name:'Preview courses from this page'})).toBeNull();
});
function deferred(){
  let finish!:(value:FileOutcome<HtmlSource>)=>void;
  window.ttap={openRegistration:vi.fn().mockResolvedValue(undefined),setRegistrationBounds:vi.fn(),getRegistrationStatus:vi.fn().mockResolvedValue({loading:false,error:''}),reloadRegistration:vi.fn(),readRegistrationPage:vi.fn().mockImplementation(()=>new Promise(resolve=>{finish=resolve;})),pickHtml:vi.fn(),openProject:vi.fn(),exportImage:vi.fn(),exportProject:vi.fn(),setDirty:vi.fn(),onCloseRequested:()=>()=>{},confirmClose:vi.fn()};
  return {finish:()=>finish({status:'ok',value:{name:'Test schedule',text:'<table></table>'}})};
}
it('ignores a page capture that finishes after the user leaves registration',async()=>{
  const capture=deferred(),onSource=vi.fn();const view=render(<RegistrationScreen onSource={onSource} suspended={false}/>);
  await userEvent.click(screen.getByRole('button',{name:'Preview courses from this page'}));view.unmount();await act(async()=>capture.finish());expect(onSource).not.toHaveBeenCalled();
});
it('cancels pending capture while a parent dialog suspends registration',async()=>{
  const capture=deferred(),onSource=vi.fn();const view=render(<RegistrationScreen onSource={onSource} suspended={false}/>);
  await userEvent.click(screen.getByRole('button',{name:'Preview courses from this page'}));view.rerender(<RegistrationScreen onSource={onSource} suspended/>);
  await act(async()=>capture.finish());expect(onSource).not.toHaveBeenCalled();view.rerender(<RegistrationScreen onSource={onSource} suspended={false}/>);expect(screen.getByRole('button',{name:'Preview courses from this page'})).toBeEnabled();
});
it('shows UTAR login errors without hiding the form or calling a credential API',async()=>{
  deferred();vi.mocked(window.ttap!.getRegistrationStatus).mockResolvedValue({loading:false,error:'',loginError:'Invalid verification code. Please try again.'});
  render(<RegistrationScreen onSource={vi.fn()} suspended={false}/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Invalid verification code. Please try again.');
  expect(screen.queryByText('UTAR is unavailable')).toBeNull();
});
it('shows the actual connection problem prominently with a retry action',async()=>{
  deferred();vi.mocked(window.ttap!.getRegistrationStatus).mockResolvedValue({loading:false,error:'UTAR returned HTTP 503 Service Unavailable.'});
  render(<RegistrationScreen onSource={vi.fn()} suspended={false}/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('HTTP 503');expect(screen.getByRole('button',{name:'Reload'})).toBeEnabled();
});
it('keeps the native registration view when a Web proxy is configured',async()=>{deferred();render(<RegistrationScreen onSource={vi.fn()} suspended={false} registrationProxy={{origin:'https://registration.example.com',plannerOrigin:location.origin}}/>);expect(screen.queryByTitle('UTAR Course Registration System')).toBeNull();expect(window.ttap!.openRegistration).toHaveBeenCalledOnce();expect(screen.getByRole('button',{name:'Preview courses from this page'})).toBeVisible();await act(async()=>{});});
