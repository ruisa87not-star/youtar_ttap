import type { ClassOption, Meeting, Project } from '../../src/shared/model';
export function makeMeeting(patch: Partial<Meeting> = {}): Meeting {
  return { day: 1, startMinute: 540, endMinute: 600, weeks: [1, 2, 3], room: 'KB101', ...patch };
}
export function makeClass(patch: Partial<ClassOption> = {}): ClassOption {
  const value = { courseCode: 'TEST1013', type: 'L', number: '1', group: '1', meetings: [makeMeeting()], ...patch };
  return { id: JSON.stringify([value.courseCode, value.type, value.number, value.group]), ...value };
}
export function makeProject(): Project {
  return { schemaVersion: 1, sources: ['example.html'], courses: [{
    code: 'TEST1013', name: 'COMPUTING & SOCIETY', creditHours: 3,
    classes: [makeClass(), makeClass({ type: 'T', number: '2', meetings: [makeMeeting({ day: 2 })] })],
  }], selection: { courseCodes: ['TEST1013'], lockedClassIds: [], blocked: [] } };
}
