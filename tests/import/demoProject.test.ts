import {expect,it} from 'vitest';
import {createDemoProject} from '../../src/renderer/import/demoProject';
import {validateProject} from '../../src/shared/project';
import {solveTimetables} from '../../src/core/solveTimetables';
it('offers a valid multi-course catalog and real alternative timetable choices',()=>{
  const project=createDemoProject();expect(validateProject(project).ok).toBe(true);expect(project.courses).toHaveLength(18);expect(project.selection.courseCodes).toEqual([]);
  for(const code of ['MPU3143','MPU32013','MPU34072','UKMM1043']){const course=project.courses.find(c=>c.code===code)!;expect(course.classes.filter(o=>o.type==='L').length).toBeGreaterThan(1);}
  project.selection.courseCodes=['MPU3143','MPU32013','MPU34072','UKMM1043'];const result=solveTimetables(project);expect(result.solutions.length).toBeGreaterThan(1);
});
