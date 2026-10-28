import type { ClassOption, Course, HtmlSource, ImportResult, Meeting } from '../../shared/model';
import { MAX_IMPORT_BYTES, validateCourses } from '../../shared/project';

function minutes(input: string): number {
  const match = input.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) throw new Error('Unrecognized class time.');
  let hour = Number(match[1]); const minute = Number(match[2]);
  if (minute > 59 || hour > 24 || (hour === 24 && minute !== 0)) throw new Error('Invalid class time.');
  if (match[3]) {
    if (hour < 1 || hour > 12) throw new Error('Invalid 12-hour class time.');
    hour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  }
  return hour * 60 + minute;
}

function parseWeeks(input: string): number[] {
  const result = new Set<number>();
  for (const token of input.split(',')) {
    const match = token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error('Unrecognized teaching weeks.');
    const first = Number(match[1]); const last = Number(match[2] ?? match[1]);
    if (first < 1 || last > 53 || first > last) throw new Error('Teaching weeks must be between 1 and 53.');
    for (let n = first; n <= last; n++) result.add(n);
  }
  return [...result].sort((a,b)=>a-b);
}

function meeting(cells: string[], offset: number): Meeting {
  if (!cells[offset + 1]?.trim()) throw new Error('No class time; excluded from automatic planning.');
  const day = ['mon','tue','wed','thu','fri','sat','sun'].indexOf(cells[offset]?.slice(0,3).toLowerCase()) + 1;
  const times = cells[offset + 1].split(/\s*[-–]\s*/);
  if (!day || times.length !== 2) throw new Error('Unrecognized class day or time.');
  const startMinute = minutes(times[0]); const endMinute = minutes(times[1]);
  if (startMinute >= endMinute) throw new Error('Class times must end after they start.');
  return { day, startMinute, endMinute, weeks: parseWeeks(cells[offset + 3] ?? ''), room: cells[offset + 4] ?? '' };
}

// Ported from the upstream student v1/v2 parsers; see UPSTREAM.md.
// DOMParser's document is never mounted. The application CSP also blocks resources:
// https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString
export function parseUtarHtml(sources: HtmlSource[]): ImportResult {
  const result: ImportResult = { sources: [...new Set(sources.map(s=>s.name))], courses: [], issues: [] };
  if (sources.reduce((n,s)=>n + new TextEncoder().encode(s.text).length,0) > MAX_IMPORT_BYTES) {
    result.issues.push({ source: 'Import', message: 'HTML imports must total no more than 10 MiB.' }); return result;
  }
  const courses = new Map<string, Course>(); const observed = new Map<string, Set<string>>();
  const options = new Map<string, ClassOption>(); const invalid = new Set<string>(); const invalidCourses = new Set<string>();
  const emptyCourses = new Set<string>();
  for (const source of sources) {
    const doc = new DOMParser().parseFromString(source.text, 'text/html');
    const table = doc.querySelector<HTMLTableElement>('#overviewSector table');
    const issue = (message: string, row?: number, courseCode?: string) => result.issues.push({source:source.name,row,courseCode,message});
    if (!table) { issue('No UTAR course table found. Save the master schedule page, rather than the login page.'); continue; }
    const local = new Map<string, ClassOption>(); let course: Course | undefined; let previous: ClassOption | undefined;
    let hasMode = false; let hasLecturer = false;
    let expectedRows: number | undefined; let physicalRows = 0; let remarkSpan = 1; let firstRow = 0;
    function finishClass() {
      if (previous && expectedRows !== undefined && physicalRows !== expectedRows) {
        invalid.add(previous.id);
        issue(`${previous.courseCode}: incomplete class group; expected ${expectedRows} meeting rows but received ${physicalRows}. The entire class was excluded.`,firstRow,previous.courseCode);
      }
    }
    Array.from(table.rows).forEach((row,index)=>{
      const cells = Array.from(row.cells).map(c=>(c.textContent ?? '').replace(/\s+/g,' ').trim());
      if (!cells.length) return;
      const continuation = /^subRow/i.test(row.id);
      if (!continuation) { finishClass(); previous=undefined; expectedRows=undefined; physicalRows=0; remarkSpan=1; }
      const labels=cells.map(c=>c.toLowerCase().replace(/[^a-z]/g,''));
      const columnHeading=labels[0]==='no' && labels[1]==='type' && labels[2]==='group' && labels.includes('day') && labels.includes('time');
      if (columnHeading) { hasMode=labels[3]==='mode' || labels[3]==='classmode'; hasLecturer=labels[hasMode?10:9]?.startsWith('lecturer')??false; return; }
      // Prerequisite tooltips can contain their own table and th elements.
      if (Array.from(row.cells).some(cell=>cell.tagName==='TH')) { issue('Unrecognized course table headings.',index+1); return; }
      const header = cells[0].match(/^(.+?)\s+-\s+(.+?)\s*\[(\d+(?:\.\d+)?)\]/);
      if (header && (cells.length === 1 || cells.length === 4)) {
        const [,code,name,credit] = header; const existing = courses.get(code);
        if (existing && (existing.name !== name.trim() || existing.creditHours !== Number(credit))) {
          invalidCourses.add(code); issue(`${code}: conflicting course details across sources.`,index+1,code);
        }
        course = existing ?? {code,name:name.trim(),creditHours:Number(credit),classes:[]};
        courses.set(code,course); if (!observed.has(code)) observed.set(code,new Set()); previous = undefined; return;
      }
      if (!course) { issue('A class row has no recognizable course heading.',index+1); return; }
      if (continuation && !previous) { issue(`${course.code}: orphan continuation row; no preceding class.`,index+1,course.code); return; }
      const remarkIndex=(hasMode?10:9)+(hasLecturer?1:0);
      if (!continuation && cells.length===1 && row.cells[0].colSpan===remarkIndex+1 && /^no record found[!.]*$/i.test(cells[0])) { emptyCourses.add(course.code); return; }
      if (!continuation) {
        const type = cells[1]?.toUpperCase();
        if (type) observed.get(course.code)!.add(type);
        const number = cells[0]; const group = cells[2];
        previous = {id:JSON.stringify([course.code,type,number,group]),courseCode:course.code,type,number,group,meetings:[],
          ...(hasMode ? {classMode:cells[3]} : {}), classSize:cells[hasMode ? 4 : 3], remark:cells[remarkIndex] ?? ''};
        if (!local.has(previous.id)) local.set(previous.id,previous); else previous = local.get(previous.id)!;
        firstRow=index+1; physicalRows=1;
        const offset=hasMode?5:4;
        const spans=Array.from(row.cells).filter((cell,i)=>(i<offset || i===remarkIndex) && cell.hasAttribute('rowspan')).map(cell=>Number(cell.getAttribute('rowspan')));
        if (spans.length) {
          if (spans.some(span=>!Number.isInteger(span) || span<1 || span>table.rows.length || span!==spans[0])) {
            invalid.add(previous.id);issue(`${course.code}: invalid or inconsistent class row spans; the entire class was excluded.`,index+1,course.code);
          } else expectedRows=spans[0];
        }
        remarkSpan=row.cells[remarkIndex]?.rowSpan??1;
      } else {
        // Count source rows, even when equal meetings will be deduplicated.
        physicalRows++;
      }
      const option = previous!;
      try {
        if (course.name.toLowerCase() === 'industrial training') throw new Error('Industrial Training does not participate in automatic planning.');
        const expectedCells=continuation?(hasLecturer?6:5)+(physicalRows<=remarkSpan?0:1):remarkIndex+1;
        if (cells.length !== expectedCells) throw new Error('Incomplete class row; the entire class was excluded.');
        const next = meeting(cells, continuation ? 0 : hasMode ? 5 : 4);
        if (!option.meetings.some(m=>JSON.stringify(m)===JSON.stringify(next))) option.meetings.push(next);
      } catch (e) { invalid.add(option.id); issue(`${course.code}: ${(e as Error).message}`,index+1,course.code); }
    });
    finishClass();
    for (const [id,option] of local) {
      const old = options.get(id);
      if (!old) { options.set(id,option); continue; }
      const a = new Set(old.meetings.map(m=>JSON.stringify(m))); const b = new Set(option.meetings.map(m=>JSON.stringify(m)));
      if ([...a].every(m=>b.has(m)) || [...b].every(m=>a.has(m))) {
        if (b.size > a.size) options.set(id,option);
      } else { invalid.add(id); issue(`${option.courseCode}: conflicting meetings for class ${option.number}; excluded.`,undefined,option.courseCode); }
    }
  }
  for (const course of courses.values()) {
    course.classes = [...options.values()].filter(o=>o.courseCode===course.code && !invalid.has(o.id));
    if (!course.classes.length && !invalidCourses.has(course.code) && !observed.get(course.code)?.size && emptyCourses.has(course.code)) {
      result.issues.push({source:'Import',courseCode:course.code,message:`${course.code}: no classes are listed; excluded from planning.`}); continue;
    }
    const missing = [...(observed.get(course.code) ?? [])].filter(type=>!course.classes.some(c=>c.type===type));
    if (invalidCourses.has(course.code) || missing.length || !course.classes.length) {
      result.issues.push({source:'Import',courseCode:course.code,message:`${course.code}: course excluded because ${missing.join(', ') || 'its required classes'} has no complete, consistent class.`}); continue;
    }
    const checked = validateCourses([course]);
    if (checked.ok) result.courses.push(checked.value[0]);
    else checked.errors.forEach(message=>result.issues.push({source:'Import',courseCode:course.code,message}));
  }
  return result;
}
