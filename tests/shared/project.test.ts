import { describe, expect, it } from 'vitest';
import { decodeProject, encodeProject, MAX_IMPORT_BYTES, validateCourses, validateProject } from '../../src/shared/project';
import { makeProject } from '../fixtures/projects';

describe('portable project format', () => {
  it('round trips the actual encoded result', () => {
    const project = makeProject();
    const encoded = encodeProject(project);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) throw new Error(encoded.errors.join(', '));
    expect(decodeProject(encoded.value)).toEqual({ ok: true, value: project });
  });
  it('rejects broken JSON and unsupported versions', () => {
    expect(decodeProject('{').ok).toBe(false);
    expect(validateProject({ ...makeProject(), schemaVersion: 2 }).ok).toBe(false);
  });
  it.each([null, [], 'wrong', {}, { schemaVersion: 1, courses: null }])('rejects invalid shapes: %j', value => {
    expect(validateProject(value).ok).toBe(false);
  });
  it.each(['missing-course', 'missing-class', 'unselected-lock', 'two-locks'])('rejects invalid references: %s', kind => {
    const p = makeProject();
    if (kind === 'missing-course') p.selection.courseCodes.push('missing');
    if (kind === 'missing-class') p.selection.lockedClassIds.push('missing');
    if (kind === 'unselected-lock') { p.selection.courseCodes = []; p.selection.lockedClassIds = [p.courses[0].classes[0].id]; }
    if (kind === 'two-locks') { const another = structuredClone(p.courses[0].classes[0]); another.number = '3'; another.id = JSON.stringify(['TEST1013','L','3','1']); p.courses[0].classes.push(another); p.selection.lockedClassIds = [another.id, p.courses[0].classes[0].id]; }
    expect(validateProject(p).ok).toBe(false);
  });
  it.each(['reversed-time', 'nan', 'duplicate-id', 'bad-day', 'bad-week', 'blank-code', 'empty-meetings', 'bad-id'])('rejects invalid courses: %s', kind => {
    const p = makeProject(); const c = p.courses[0]; const m = c.classes[0].meetings[0];
    if (kind === 'reversed-time') m.endMinute = m.startMinute;
    if (kind === 'nan') m.startMinute = NaN;
    if (kind === 'duplicate-id') c.classes.push(structuredClone(c.classes[0]));
    if (kind === 'bad-day') m.day = 8;
    if (kind === 'bad-week') m.weeks = [54];
    if (kind === 'blank-code') c.code = ' ';
    if (kind === 'empty-meetings') c.classes[0].meetings = [];
    if (kind === 'bad-id') c.classes[0].id = 'forged';
    expect(validateCourses(p.courses).ok).toBe(false);
  });
  it('rejects invalid blocked periods', () => {
    const p = makeProject(); p.selection.blocked.push({ day: 0, startMinute: 600, endMinute: 500 });
    expect(validateProject(p).ok).toBe(false);
  });
  it('counts UTF-8 bytes, including multibyte text', () => {
    const p = makeProject(); p.sources = ['課'.repeat(Math.ceil(MAX_IMPORT_BYTES / 3))];
    expect(decodeProject(JSON.stringify(p)).ok).toBe(false);
    expect(encodeProject(p).ok).toBe(false);
  });
});
