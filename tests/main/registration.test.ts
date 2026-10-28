// @vitest-environment node
import {EventEmitter} from 'node:events';
import {beforeEach,expect,it,vi} from 'vitest';
import {createRegistrationView,isRegistrationURL,isScheduleURL} from '../../src/main/registration';
import {initialWindowBounds} from '../../src/main/windowBounds';
const mock=vi.hoisted(()=>({views:[] as any[],partition:vi.fn(),session:{setPermissionRequestHandler:vi.fn(),setPermissionCheckHandler:vi.fn(),on:vi.fn()}}));
vi.mock('electron',()=>({session:{fromPartition:(...args:unknown[])=>{mock.partition(...args);return mock.session;}},WebContentsView:class {
  prefs:unknown;url='https://unitreg.utar.edu.my/portal/courseRegStu/login.jsp';setBackgroundColor=vi.fn();setVisible=vi.fn();setBounds=vi.fn();
  webContents={isDestroyed:()=>false,loadURL:vi.fn().mockResolvedValue(undefined),on:vi.fn(),insertCSS:vi.fn().mockResolvedValue('style-key'),setWindowOpenHandler:vi.fn(),close:vi.fn(),getURL:()=>this.url,executeJavaScript:vi.fn()};
  constructor(options:unknown){this.prefs=options;mock.views.push(this);}
}}));
beforeEach(()=>{vi.clearAllMocks();mock.views.length=0;});
function controller(){const window=Object.assign(new EventEmitter(),{getContentSize:()=>[800,600],contentView:{addChildView:vi.fn()}});const port=createRegistrationView(window as never);port.open();return {port,view:mock.views[0]};}
it.each(['http://unitreg.utar.edu.my/','https://unitreg.utar.edu.my.attacker.test/','https://user:pass@unitreg.utar.edu.my/','https://unitreg.utar.edu.my:444/','file:///C:/test.html','javascript:alert(1)'])('rejects a remote navigation outside the exact official HTTPS origin: %s',value=>{expect(isRegistrationURL(value)).toBe(false);});
it('imports only the known timetable path and never a login or other page',()=>{
  expect(isScheduleURL('https://unitreg.utar.edu.my/portal/courseRegStu/schedule/masterSchedule.jsp')).toBe(true);
  expect(isScheduleURL('https://unitreg.utar.edu.my/portal/courseRegStu/schedule/masterScheduleSurvey.jsp')).toBe(true);
  expect(isScheduleURL('https://unitreg.utar.edu.my/portal/courseRegStu/schedule/masterScheduleSurvey.jsp/other')).toBe(false);
  expect(isScheduleURL('https://unitreg.utar.edu.my/portal/courseRegStu/login.jsp')).toBe(false);expect(isScheduleURL('https://unitreg.utar.edu.my/portal/courseRegStu/account.jsp')).toBe(false);
});
it('creates an isolated native view without a preload, node access or saved partition',()=>{
  const {view}=controller();expect(mock.partition).toHaveBeenCalledWith('ttap-registration',{cache:false});
  expect(view.prefs.webPreferences).toMatchObject({sandbox:true,contextIsolation:true,nodeIntegration:false,webSecurity:true,allowRunningInsecureContent:false});expect(view.prefs.webPreferences.preload).toBeUndefined();
  expect(view.webContents.loadURL).toHaveBeenCalledExactlyOnceWith('https://unitreg.utar.edu.my/portal/courseRegStu/login.jsp');
});
it('keeps invalid or out-of-window native bounds hidden',()=>{
  const {port,view}=controller();for(const rect of [{x:0,y:0,width:800,height:600},{x:0,y:56,width:900,height:200},{x:NaN,y:100,width:100,height:100}]){port.setBounds(rect);expect(view.setVisible).toHaveBeenLastCalledWith(false);}
  port.setBounds({x:16,y:160,width:768,height:420});expect(view.setBounds).toHaveBeenCalledWith({x:16,y:160,width:768,height:420});expect(view.setVisible).toHaveBeenLastCalledWith(true);
  port.setBounds(null);expect(view.setVisible).toHaveBeenLastCalledWith(false);
});
it('only styles the official login document without reading or replacing its form',()=>{
  const {view}=controller();const ready=view.webContents.on.mock.calls.find(([event]:[string])=>event==='dom-ready')[1];ready();
  expect(view.webContents.insertCSS).toHaveBeenCalledOnce();expect(view.webContents.executeJavaScript).not.toHaveBeenCalled();
  view.url='https://unitreg.utar.edu.my/portal/courseRegStu/schedule/masterSchedule.jsp';ready();expect(view.webContents.insertCSS).toHaveBeenCalledOnce();
});
it('does not evaluate or return login-page HTML',async()=>{
  const {port,view}=controller();expect((await port.readPage()).status).toBe('error');expect(view.webContents.executeJavaScript).not.toHaveBeenCalled();
});
it.each(['masterSchedule.jsp','masterScheduleSurvey.jsp'])('reads %s with bounded data and rejects a navigation race or oversized result',async path=>{
  const {port,view}=controller();view.url='https://unitreg.utar.edu.my/portal/courseRegStu/schedule/'+path;view.webContents.executeJavaScript.mockResolvedValue('<table>courses</table>');
  expect(await port.readPage()).toEqual({status:'ok',value:{name:'UTAR course schedule',text:'<table>courses</table>'}});
  view.webContents.executeJavaScript.mockResolvedValue('x'.repeat(10*1024*1024+1));expect((await port.readPage()).status).toBe('error');
  view.webContents.executeJavaScript.mockImplementation(async()=>{view.url='https://unitreg.utar.edu.my/portal/courseRegStu/login.jsp';return '<input value="private">';});expect((await port.readPage()).status).toBe('error');
});
it.each([{x:0,y:0,width:1280,height:720},{x:-1000,y:50,width:800,height:500},{x:0,y:0,width:3840,height:2000}])('keeps initial window and its minimum within the work area',area=>{
  const bounds=initialWindowBounds(area);expect(bounds.x).toBeGreaterThanOrEqual(area.x);expect(bounds.y).toBeGreaterThanOrEqual(area.y);expect(bounds.x+bounds.width).toBeLessThanOrEqual(area.x+area.width);expect(bounds.y+bounds.height).toBeLessThanOrEqual(area.y+area.height);expect(bounds.minHeight).toBeLessThanOrEqual(bounds.height);
});
it('reports an actual load failure and preserves an HTTP failure after finish-load',()=>{
  const {port,view}=controller();const handler=(name:string)=>view.webContents.on.mock.calls.find(([event]:[string])=>event===name)[1];
  handler('did-fail-load')({},-105,'ERR_NAME_NOT_RESOLVED',view.url,true);expect(port.status().error).toContain('ERR_NAME_NOT_RESOLVED');
  handler('did-start-loading')();handler('did-navigate')({},view.url,503,'Service Unavailable');handler('did-finish-load')();expect(port.status().error).toContain('HTTP 503');
});
it.each(['will-navigate','will-redirect'])('securely upgrades UTAR legacy HTTP navigation at %s without sending it',async eventName=>{
  const {port,view}=controller();const preventDefault=vi.fn();
  const handler=view.webContents.on.mock.calls.find(([event]:[string])=>event===eventName)[1];
  handler({preventDefault},'http://unitreg.utar.edu.my/portal/courseRegStu/indexSurvey.jsp?passid=synthetic-only#section');
  await Promise.resolve();
  expect(preventDefault).toHaveBeenCalledOnce();
  expect(view.webContents.loadURL).toHaveBeenLastCalledWith('https://unitreg.utar.edu.my/portal/courseRegStu/indexSurvey.jsp?passid=synthetic-only#section');
  expect(port.status().error).toBe('');
});
it.each(['http://unitreg.utar.edu.my:81/','http://user:pass@unitreg.utar.edu.my/','http://unitreg.utar.edu.my.attacker.test/','https://unitreg.utar.edu.my:444/','javascript:alert(1)'])('does not upgrade or load an untrusted destination: %s',url=>{
  const {port,view}=controller();const preventDefault=vi.fn();
  const handler=view.webContents.on.mock.calls.find(([event]:[string])=>event==='will-redirect')[1];handler({preventDefault},url);
  expect(preventDefault).toHaveBeenCalledOnce();expect(view.webContents.loadURL).toHaveBeenCalledTimes(1);expect(port.status().error).toContain('leave the UTAR');
});
