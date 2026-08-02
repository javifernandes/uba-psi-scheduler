import { describe, expect, it } from 'vitest';
import {
  courseIsAvailable,
  missingPrerequisites,
  planCourseById,
  planProgressPercent,
} from './psychology-plan';

describe('psychology plan', () => {
  it('habilita una materia cuando sus correlativas están regularizadas o aprobadas', () => {
    const course = planCourseById.metodologia!;
    expect(courseIsAvailable(course, { ppb: 'regularized', estadistica: 'approved' })).toBe(true);
  });

  it('explica cuáles correlativas faltan', () => {
    const course = planCourseById['clinica-1']!;
    expect(missingPrerequisites(course, { psicopatologia: 'approved' })).toEqual([
      'diagnostico-1',
      'diagnostico-2',
    ]);
  });

  it('calcula avance usando sólo materias aprobadas', () => {
    expect(planProgressPercent({ ppb: 'approved', estadistica: 'regularized' })).toBe(5);
  });
});
