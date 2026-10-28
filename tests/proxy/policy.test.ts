// @vitest-environment node
import {expect,it} from 'vitest';
import {readConfig} from '../../server/registration-proxy/config.ts';
import {upstreamURL,requestTarget,isPublicAddress,LOGIN} from '../../server/registration-proxy/policy.ts';
const env={PROXY_PUBLIC_ORIGIN:'https://registration.example.com',PLANNER_ORIGIN:'https://planner.example.com'};
it('requires distinct same-site HTTPS hostnames and does not expose an insecure production override',()=>{
  expect(readConfig(env)).toMatchObject({publicOrigin:env.PROXY_PUBLIC_ORIGIN,plannerOrigin:env.PLANNER_ORIGIN,host:'127.0.0.1',port:3000,secureCookies:true});
  for(const value of ['http://registration.example.com','https://planner.example.com','https://other.example.net','https://registration.example.com/path','https://user:pass@registration.example.com','https://registration.example.com/?token=x','https://127.0.0.1','https://localhost'])expect(()=>readConfig({...env,PROXY_PUBLIC_ORIGIN:value,ALLOW_INSECURE:'true'})).toThrow();
  expect(()=>readConfig({...env,PROXY_PUBLIC_ORIGIN:'https://attacker.github.io',PLANNER_ORIGIN:'https://victim.github.io'})).toThrow();
});
it('upgrades only the exact official legacy HTTP origin while preserving an encoded passid',()=>{
  expect(upstreamURL('http://unitreg.utar.edu.my:80/portal/courseRegStu/indexSurvey.jsp?passid=synthetic%2Fonly',LOGIN,'GET').href).toBe('https://unitreg.utar.edu.my/portal/courseRegStu/indexSurvey.jsp?passid=synthetic%2Fonly');
  for(const value of ['https://evil.example/','http://unitreg.utar.edu.my:81/portal/courseRegStu/login.jsp','https://unitreg.utar.edu.my:444/portal/courseRegStu/login.jsp','https://unitreg.utar.edu.my.evil.example/','https://user:pass@unitreg.utar.edu.my/portal/courseRegStu/login.jsp','javascript:alert(1)','file:///private'])expect(()=>upstreamURL(value,LOGIN,'GET')).toThrow();
});
it('allows only known read-only pages/resources and the login POST, with bounded unambiguous query fields',()=>{
  expect(upstreamURL('../Kaptcha.jpg',LOGIN,'GET').pathname).toBe('/portal/Kaptcha.jpg');
  expect(upstreamURL('schedule/masterScheduleSurvey.jsp?passid=synthetic-only',LOGIN,'GET').pathname).toContain('masterScheduleSurvey.jsp');
  expect(upstreamURL('loginProSurvey.jsp',LOGIN,'POST').pathname).toContain('loginProSurvey.jsp');
  for(const [path,method] of [['schedule/masterScheduleSurvey.jsp','POST'],['registration/submit.jsp','POST'],['login.jsp?url=https://evil.example','GET'],['indexSurvey.jsp?passid=a&passid=b','GET'],['indexSurvey.jsp?passid=%0a','GET'],['indexSurvey.jsp?passid='+ 'x'.repeat(513),'GET'],['skin/../../mutate.jsp','GET']])expect(()=>upstreamURL(path,LOGIN,method as 'GET'|'POST')).toThrow();
});
it.each(['/portal/x/../courseRegStu/login.jsp','/portal/courseRegStu/%2e%2e/login.jsp','/portal/courseRegStu/%2flogin.jsp','/portal\\courseRegStu/login.jsp','//evil.example/','https://evil.example/','/portal/courseRegStu/login.jsp#fragment'])('rejects raw request path ambiguity before URL normalization: %s',value=>{expect(()=>requestTarget(value)).toThrow();});
it('rejects local/private/mapped/special IPs before the production transport opens a socket',()=>{
  for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','0.0.0.0','224.0.0.1','::1','fc00::1','fe80::1','::ffff:127.0.0.1','2001:db8::1'])expect(isPublicAddress(ip),ip).toBe(false);
  expect(isPublicAddress('8.8.8.8')).toBe(true);expect(isPublicAddress('2606:4700:4700::1111')).toBe(true);
});
