import {expect,it} from 'vitest';
import {readLoginError} from '../../src/shared/loginError';
it('returns only visible login error text and never input values or account content',()=>{
  document.body.innerHTML='<p>Private account name</p><form><input value="student-id"><input type="password" value="secret-password"></form><div role="alert">Invalid verification code.</div><div class="error" hidden>Hidden error</div>';
  expect(readLoginError(document)).toBe('Invalid verification code.');
  document.querySelector('[role=alert]')!.remove();expect(readLoginError(document)).toBe('');
});
