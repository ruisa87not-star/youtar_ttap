import {expect,it} from 'vitest';
import {buildRegistrationScript,readCourseTable} from '../../src/shared/registrationScripts';
it('extracts only the course table and refuses login forms even with a table present',()=>{
  document.body.innerHTML='<header>synthetic-account-marker</header><div id="overviewSector"><table><tr><td>TEST1013</td></tr></table></div>';
  const result=readCourseTable(document);expect(result.kind).toBe('table');expect(result.text).toContain('TEST1013');expect(result.text).not.toContain('synthetic-account-marker');
  document.body.insertAdjacentHTML('beforeend','<input type="password" value="synthetic-only">');expect(readCourseTable(document)).toEqual({kind:'login'});
  document.body.innerHTML='<p>No courses</p>';expect(readCourseTable(document)).toEqual({kind:'missing'});
});
it('generates self-contained native scripts without privileged bridge access and preserves login errors',()=>{
  document.body.innerHTML='<div id="body_col"><h2>Course Registration System</h2></div><form><input type="password"></form><div role="alert">Synthetic login error</div>';
  const script=buildRegistrationScript();expect(script).not.toMatch(/__TAURI|window\.ttap|invoke\(/);
  new Function('window','document','location',script)(window,document,{pathname:'/portal/courseRegStu/login.jsp'});
  const probe=Reflect.get(window,'__ttapRegistration') as {status:()=>{loginError:string};read:()=>unknown};
  expect(probe.status().loginError).toBe('Synthetic login error');expect(probe.read()).toEqual({kind:'login'});
  expect(document.querySelector('form input[type=password]')).not.toBeNull();expect(document.querySelector('#ttap-registration-style')).not.toBeNull();
});
it('bounds extracted UTF-8 before sending content through the native callback',()=>{
  document.body.innerHTML='<div id="overviewSector"><table><tr><td></td></tr></table></div>';
  document.querySelector('td')!.textContent='課'.repeat(Math.ceil(10*1024*1024/3));
  expect(readCourseTable(document).kind).toBe('too-large');
});
