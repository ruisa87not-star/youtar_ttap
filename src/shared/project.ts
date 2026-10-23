import type { ClassOption, Course, Meeting, Project, Result } from './model';
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_SOLUTIONS = 500;

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const integer = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const failure = (message: string): { ok: false; errors: string[] } => ({ ok: false, errors: [message] });
const stringList = (v: unknown): v is string[] => Array.isArray(v) && v.every(text) && new Set(v).size === v.length;
const validPeriod = (v: Record<string, unknown>) => integer(v.day, 1, 7) && integer(v.startMinute, 0, 1439) && integer(v.endMinute, 1, 1440) && v.startMinute < v.endMinute;

export function validateCourses(value: unknown): Result<Course[]> {
  if (!Array.isArray(value)) return failure('Courses must be a list.');
  const courses: Course[] = []; const codes = new Set<string>(); const ids = new Set<string>();
  for (const c of value) {
    if (!record(c) || !text(c.code) || !text(c.name) || codes.has(c.code) || !Array.isArray(c.classes) || !c.classes.length) return failure('Each course needs a unique code, a name and complete classes.');
    if (c.creditHours !== undefined && (typeof c.creditHours !== 'number' || !Number.isFinite(c.creditHours) || c.creditHours < 0)) return failure(`Invalid credit hours for ${c.code}.`);
    codes.add(c.code); const classes: ClassOption[] = [];
    for (const s of c.classes) {
      if (!record(s) || s.courseCode !== c.code || !text(s.type) || !text(s.number) || !text(s.group) || !text(s.id) || ids.has(s.id) || s.id !== JSON.stringify([c.code, s.type, s.number, s.group])) return failure(`Invalid or duplicate class identity in ${c.code}.`);
      if (!Array.isArray(s.meetings) || !s.meetings.length) return failure(`A class in ${c.code} has no meetings.`);
      const meetings: Meeting[] = [];
      for (const m of s.meetings) {
        if (!record(m) || !validPeriod(m) || typeof m.room !== 'string' || !Array.isArray(m.weeks) || !m.weeks.length || !m.weeks.every(w => integer(w, 1, 53))) return failure(`Invalid day, time or weeks in ${c.code}.`);
        meetings.push({ day: m.day as number, startMinute: m.startMinute as number, endMinute: m.endMinute as number, weeks: [...new Set(m.weeks as number[])].sort((a,b) => a-b), room: m.room });
      }
      const option: ClassOption = { id: s.id, courseCode: c.code, type: s.type, number: s.number, group: s.group, meetings };
      for (const key of ['remark', 'classMode', 'classSize'] as const) {
        if (s[key] !== undefined && typeof s[key] !== 'string') return failure(`Invalid ${key} in ${c.code}.`);
        if (typeof s[key] === 'string') option[key] = s[key];
      }
      ids.add(s.id); classes.push(option);
    }
    courses.push({ code: c.code, name: c.name, ...(typeof c.creditHours === 'number' ? { creditHours: c.creditHours } : {}), classes });
  }
  return { ok: true, value: courses };
}

export function validateProject(value: unknown): Result<Project> {
  if (!record(value) || value.schemaVersion !== 1) return failure('This file is not a supported youtar_ttap project (version 1).');
  const courses = validateCourses(value.courses);
  if (!courses.ok) return courses;
  if (!stringList(value.sources) || !record(value.selection)) return failure('The project source or selection information is invalid.');
  const s = value.selection;
  if (!stringList(s.courseCodes) || !stringList(s.lockedClassIds) || !Array.isArray(s.blocked)) return failure('The project selections are invalid.');
  const selected = new Set(s.courseCodes); const codes = new Set(courses.value.map(c => c.code));
  if (s.courseCodes.some(code => !codes.has(code))) return failure('A selected course is missing from this project.');
  const options = new Map(courses.value.flatMap(c => c.classes).map(c => [c.id, c])); const lockedTypes = new Set<string>();
  for (const id of s.lockedClassIds) {
    const option = options.get(id); const key = option && JSON.stringify([option.courseCode, option.type]);
    if (!option || !selected.has(option.courseCode) || !key || lockedTypes.has(key)) return failure('A fixed class is missing, unselected or conflicts with another fixed class of the same type.');
    lockedTypes.add(key);
  }
  if (s.blocked.some(b => !record(b) || !validPeriod(b))) return failure('An unavailable time has an invalid day or time range.');
  return { ok: true, value: { schemaVersion: 1, sources: [...value.sources], courses: courses.value, selection: {
    courseCodes: [...s.courseCodes], lockedClassIds: [...s.lockedClassIds], blocked: s.blocked.map(b => ({ day: b.day, startMinute: b.startMinute, endMinute: b.endMinute })),
  } } };
}

export function decodeProject(input: string): Result<Project> {
  if (new TextEncoder().encode(input).length > MAX_IMPORT_BYTES) return failure('Project files must be no larger than 10 MiB.');
  try { return validateProject(JSON.parse(input)); }
  catch { return failure('This file does not contain valid JSON.'); }
}

export function encodeProject(project: Project): Result<string> {
  const checked = validateProject(project);
  if (!checked.ok) return checked;
  const value = JSON.stringify(checked.value, null, 2);
  return new TextEncoder().encode(value).length <= MAX_IMPORT_BYTES ? { ok: true, value } : failure('Project files must be no larger than 10 MiB.');
}
