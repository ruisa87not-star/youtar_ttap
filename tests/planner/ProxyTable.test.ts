import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {sanitizeCourseTable} from '../../src/shared/proxyTable';
import {parseUtarHtml} from '../../src/renderer/import/parseUtarHtml';
it('sends table data only, stripping token URLs, hidden fields/scripts and preserving current nested/rowspan layout',()=>{
  const fixture=readFileSync('tests/fixtures/student-lecturer.html','utf8'),token='synthetic-high-entropy-session-canary';
  const doc=new DOMParser().parseFromString('<p>synthetic-account-canary</p>'+fixture.replace('Synthetic lecture note',`Synthetic lecture note <a href="https://unitreg.utar.edu.my/?passid=${token}">Help</a><input type="hidden" value="${token}"><script>window.secret="${token}"</script>`),'text/html');
  const result=sanitizeCourseTable(doc,[token]);expect(result.kind).toBe('table');expect(result.text).not.toContain(token);expect(result.text).not.toContain('synthetic-account-canary');expect(result.text).not.toMatch(/href=|<input|<script/);
  const parsed=parseUtarHtml([{name:'Synthetic proxy',text:result.text!}]);expect(parsed.issues).toEqual([]);expect(parsed.courses).toHaveLength(2);expect(parsed.courses[0].classes[0].meetings).toHaveLength(2);
});
it('rejects login pages and redacts known token text without treating ordinary small numbers as secrets',()=>{
  const fixture=readFileSync('tests/fixtures/student-lecturer.html','utf8'),token='synthetic-high-entropy-session-canary';
  const doc=new DOMParser().parseFromString(fixture.replace('Synthetic lecture note','passid='+token),'text/html');const result=sanitizeCourseTable(doc,[token]);expect(result.text).not.toContain(token);expect(parseUtarHtml([{name:'test',text:result.text!}]).courses).toHaveLength(2);
  doc.body.append(doc.createElement('input'));doc.querySelector('input')!.type='password';expect(sanitizeCourseTable(doc,[]).kind).toBe('login');
});
it.each([['synthetic-session-token','synthetic-<span>session-token</span>'],['synthetic-session-token','synthetic-<br>session-token'],['ABC123','AB<span>C123</span>']])('redacts accepted token %s after text is reconstructed without changing ordinary course numbers',(token,markup)=>{const fixture=readFileSync('tests/fixtures/student-lecturer.html','utf8');const result=sanitizeCourseTable(new DOMParser().parseFromString(fixture.replace('Synthetic lecture note',markup),'text/html'),[token]);expect(result.kind).toBe('table');expect(new DOMParser().parseFromString(result.text!,'text/html').body.textContent).not.toContain(token);expect(result.text).not.toContain(token);const parsed=parseUtarHtml([{name:'synthetic',text:result.text!}]);expect(parsed.issues).toEqual([]);expect(parsed.courses[0].classes[0].group).toBe('1');expect(parsed.courses[0].classes[0].meetings[0].startMinute).toBe(540);});
it('refuses transfer when a short numeric session token overlaps ordinary course values',()=>{const doc=new DOMParser().parseFromString(readFileSync('tests/fixtures/student-lecturer.html','utf8'),'text/html');const result=sanitizeCourseTable(doc,['1']);expect(result.kind).not.toBe('table');expect(result.text).toBeUndefined();expect(doc.querySelector('td[rowspan]')?.textContent).toBe('1');});
