import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseUtarHtml } from '../../src/renderer/import/parseUtarHtml';
import { readHtmlFiles } from '../../src/platform/browserFiles';
import { MAX_IMPORT_BYTES } from '../../src/shared/project';
const v2 = readFileSync('tests/fixtures/student-v2.html', 'utf8');
const v1 = readFileSync('tests/fixtures/student-v1.html', 'utf8');
const page = readFileSync('tests/fixtures/paginated.html', 'utf8');
const tdMode = readFileSync('tests/fixtures/student-td-mode.html', 'utf8');
const lecturer = readFileSync('tests/fixtures/student-lecturer.html', 'utf8');
const parse = (text: string) => parseUtarHtml([{ name: 'test.html', text }]);
describe('UTAR course pages', () => {
  it('reports an official No Record Found row as unavailable without inventing an incomplete class',()=>{
    const html=lecturer.replace(/<\/table><\/div>\s*$/,'<tr><td colspan="12">NONE0001 - UNAVAILABLE COURSE [1]</td></tr><tr><td colspan="12">No Record Found!!!</td></tr></table></div>');
    const r=parse(html);expect(r.courses).toHaveLength(2);expect(r.issues).toEqual([{source:'Import',courseCode:'NONE0001',message:'NONE0001: no classes are listed; excluded from planning.'}]);
  });
  it('imports the current Lecturer/Tutor column without shifting room, weeks or spanned remarks',()=>{
    const r=parse(lecturer);expect(r.issues).toEqual([]);expect(r.courses).toHaveLength(2);
    const course=r.courses[0];expect(course.classes).toHaveLength(2);
    expect(course.classes[0]).toMatchObject({type:'L',classMode:'Physical',classSize:'40',remark:'Synthetic lecture note'});
    expect(course.classes[0].meetings).toEqual([
      {day:1,startMinute:540,endMinute:600,weeks:[1,2,3],room:'KA101'},
      {day:4,startMinute:600,endMinute:660,weeks:[1,2,3],room:'KA102'},
    ]);
    expect(course.classes[1].remark).toBe('Synthetic tutorial note');
    expect(r.courses[1].classes.find(c=>c.type==='P')?.meetings).toHaveLength(2);
  });
  it('recognizes a course heading containing a nested prerequisite table without treating its th as column headings',()=>{
    const legacy=lecturer.replace(/<td class="lecturer">[\s\S]*?<\/td>/g,'').replaceAll('colspan="12"','colspan="11"');
    const r=parse(legacy);expect(r.issues).toEqual([]);expect(r.courses.map(c=>c.code)).toEqual(['TEST2013','TEST2023']);
  });
  it('still excludes a current-layout class and course when a declared continuation is missing',()=>{
    const r=parse(lecturer.replace(/<tr id="subRow1">[\s\S]*?<\/tr>/,''));
    expect(r.courses.map(c=>c.code)).toEqual(['TEST2023']);expect(r.issues.some(i=>/incomplete class group/.test(i.message))).toBe(true);
  });
  it('recognizes archived td/Mode headings and the five-cell continuation under a spanned Remark', () => {
    const r=parse(tdMode);expect(r.issues).toEqual([]);expect(r.courses).toHaveLength(1);
    expect(r.courses[0].classes).toHaveLength(2);expect(r.courses[0].classes[0]).toMatchObject({classMode:'OTL',classSize:'40',remark:'Bring a notebook'});
    expect(r.courses[0].classes[0].meetings).toHaveLength(2);expect(r.courses[0].classes[0].meetings[1].room).toBe('KB102');
  });
  it('imports the anonymized upstream 2020 course table with complete multi-row lectures', () => {
    const r=parse(readFileSync('tests/fixtures/student-2020-sept-anonymized.html','utf8'));
    const course=r.courses.find(c=>c.code==='MPU3113');expect(course).toBeDefined();expect(course!.classes).toHaveLength(2);
    expect(course!.classes.every(c=>c.classMode==='OTL' && c.meetings.length===2)).toBe(true);
  });
  it('excludes a declared multi-row class whose continuation is missing at the next class', () => {
    const html=v2.replace('<tr><td>1</td>','<tr><td rowspan="2">1</td>').replace(/<tr id="subRow1">.*?<\/tr>/,'');
    const r=parse(html);expect(r.courses[0].classes.some(c=>c.number==='1')).toBe(false);expect(r.issues.some(i=>/incomplete/i.test(i.message))).toBe(true);
  });
  it('excludes a declared multi-row class truncated at the end of the table', () => {
    const r=parse(page.replace('<tr><td>1</td>','<tr><td rowspan="2">1</td>'));
    expect(r.courses).toEqual([]);expect(r.issues.some(i=>/incomplete/i.test(i.message))).toBe(true);
  });
  it('counts physical continuation rows before deduplicating equal meetings', () => {
    const html=v2.replace('<tr><td>1</td>','<tr><td rowspan="2">1</td>').replace('<td>Thu</td><td>10:00 AM - 11:00 AM</td><td>1</td><td>1-3</td><td>KB102</td>','<td>Mon</td><td>09:00 AM - 10:00 AM</td><td>1</td><td>1-3</td><td>KB101</td>');
    const r=parse(html);expect(r.issues).toEqual([]);expect(r.courses[0].classes.find(c=>c.number==='1')?.meetings).toHaveLength(1);
  });
  it('preserves both meetings, names and class metadata in v2', () => {
    const r = parse(v2); expect(r.courses).toHaveLength(2); expect(r.issues).toEqual([]);
    const c = r.courses[0]; expect(c.code).toBe('TEST1013'); expect(c.name).toBe('COMPUTING & SOCIETY');
    expect(c.classes[0].meetings).toHaveLength(2); expect(c.classes[0].classMode).toBe('Physical');
    expect(c.classes[0].classSize).toBe('40'); expect(c.classes[0].meetings[1].room).toBe('KB102');
  });
  it('recognizes the legacy format without class mode', () => {
    const r = parse(v1); expect(r.courses).toHaveLength(1); const c = r.courses[0]; expect(c.code).toBe('LEG1013');
    expect(c.classes[0].meetings[0]).toMatchObject({ day: 5, startMinute: 720, endMinute: 780, weeks: [1,2,3,5] });
  });
  it('merges repeated pages without duplicating meetings', () => {
    const r = parseUtarHtml([{ name: 'a.html', text: v2 }, { name: 'b.html', text: page }, { name: 'c.html', text: v2 }]);
    expect(r.courses).toHaveLength(2); expect(r.courses[0].classes).toHaveLength(3); expect(r.courses[0].classes[0].meetings).toHaveLength(2);
  });
  it('keeps the same number in different courses separate', () => {
    const r = parseUtarHtml([{name:'v1.html',text:v1},{name:'v2.html',text:v2}]);
    const ids = r.courses.flatMap(c=>c.classes).map(c=>c.id); expect(new Set(ids).size).toBe(6);
  });
  it('uses tuples even when class fields contain separators', () => {
    const a = parse(page.replace('<td>1</td><td>L</td><td>1</td>', '<td>1|2</td><td>L</td><td>3</td>'));
    const b = parse(page.replace('<td>1</td><td>L</td><td>1</td>', '<td>1</td><td>L</td><td>2|3</td>'));
    expect(a.courses).toHaveLength(1); expect(b.courses).toHaveLength(1);
    expect(a.courses[0].classes[0].id).not.toBe(b.courses[0].classes[0].id);
  });
  it.each(['', '<form>Log in</form>'])('rejects missing course tables', html => {
    expect(parse(html).courses).toEqual([]); expect(parse(html).issues.length).toBeGreaterThan(0);
  });
  it('reports orphan continuation rows', () => {
    const html = v2.replace(/<tr><td>1<\/td>.*?<\/tr>/, '');
    expect(parse(html).issues.some(i=>/continuation/i.test(i.message))).toBe(true);
  });
  it('excludes the entire class when a continuation has a missing cell', () => {
    const r = parse(v2.replace('<td>KB102</td>', ''));
    expect(r.issues.length).toBeGreaterThan(0); expect(r.courses).toHaveLength(2); expect(r.courses[0].classes.some(c=>c.number==='1')).toBe(false);
  });
  it('drops a course if every option of an observed required type is invalid', () => {
    const r = parse(v2.replace('10:00 AM - 11:00 AM</td><td>1</td><td>1-3</td><td>KB104', '</td><td>1</td><td>1-3</td><td>KB104'));
    expect(r.courses.some(c=>c.code==='TEST1013')).toBe(false);
    expect(r.issues.some(i=>i.message.includes('TEST1013'))).toBe(true);
  });
  it('does not silently merge conflicting versions of the same class', () => {
    const r = parseUtarHtml([{name:'a.html',text:page},{name:'b.html',text:page.replace('09:00 AM - 10:00 AM','09:00 AM - 11:00 AM')}]);
    expect(r.courses).toEqual([]); expect(r.issues.some(i=>/conflict/i.test(i.message))).toBe(true);
  });
  it.each(['1-999999999', '3-1', '0', '1,nope'])('rejects invalid weeks: %s', weeks => {
    const r = parse(page.replace('1-3', weeks)); expect(r.courses).toEqual([]); expect(r.issues.length).toBeGreaterThan(0);
  });
  it('explains excluded empty-time and Industrial Training records', () => {
    const empty = parse(page.replace('09:00 AM - 10:00 AM', '')); expect(empty.courses).toEqual([]); expect(empty.issues.length).toBeGreaterThan(0);
    const training = parse(page.replace('COMPUTING &amp; SOCIETY', 'INDUSTRIAL TRAINING')); expect(training.courses).toEqual([]); expect(training.issues.map(i=>i.message).join(' ')).toMatch(/industrial training/i);
  });
  it('does not execute source scripts or copy source markup to the page', () => {
    parse(`<script>window.__sourceRan=true</script><img src="https://invalid.example/track">${v2}`);
    expect((window as unknown as {__sourceRan?:boolean}).__sourceRan).toBeUndefined(); expect(document.querySelector('img')).toBeNull();
  });
  it('checks size before parsing and reading', async () => {
    expect(parse('課'.repeat(Math.ceil(MAX_IMPORT_BYTES/3))).issues.map(i=>i.message).join(' ')).toMatch(/10 MiB/);
    expect((await readHtmlFiles([new File(['x'.repeat(MAX_IMPORT_BYTES+1)], 'large.html')])).status).toBe('error');
  });
  it('reads real File objects and handles an empty selection', async () => {
    const r = await readHtmlFiles([new File([v2], 'sample.html')]);
    expect(r).toEqual({status:'ok',value:[{name:'sample.html',text:v2}]}); expect((await readHtmlFiles([])).status).toBe('cancelled');
  });
});
