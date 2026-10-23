import { expect,it } from 'vitest';
import cases from '../fixtures/upstream-cases.json';
import { fromRawRows } from '../fixtures/solver';
import { solveTimetables } from '../../src/core/solveTimetables';
it.each(cases)('matches upstream: $name ($expected solutions)',test=>{
  const result=solveTimetables({courses:fromRawRows(test.rows),selection:{courseCodes:test.codes,lockedClassIds:[],blocked:[]}});
  expect(result.solutions).toHaveLength(test.expected); expect(result.truncated).toBe(false);
});
