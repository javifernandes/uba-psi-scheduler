import { describe, expect, it } from 'vitest';
import type { SubjectData } from '@/components/scheduler/scheduler.types';
import {
  applyEnrollmentRule,
  indexMateriaCodesBySubjectId,
  normalizeEnrollmentMap,
} from './enrollment';

const subjects: SubjectData[] = [
  {
    id: '34',
    label: '(2) Psicología Social - Cátedra 34 (II)',
    header: 'h34',
    teoricos: [],
    seminarios: [],
    comisiones: [],
  },
  {
    id: '35',
    label: '(2) Psicología Social - Cátedra 35 (I)',
    header: 'h35',
    teoricos: [],
    seminarios: [],
    comisiones: [],
  },
  {
    id: '60',
    label: '(10) Estadística - Cátedra 60 (I)',
    header: 'h60',
    teoricos: [],
    seminarios: [],
    comisiones: [],
  },
];

describe('enrollment domain', () => {
  it('indexa códigos de materia por subjectId', () => {
    expect(indexMateriaCodesBySubjectId(subjects)).toEqual({
      '34': '2',
      '35': '2',
      '60': '10',
    });
  });

  it('normaliza enrollments dejando una sola cátedra por materia', () => {
    const materiaIndex = indexMateriaCodesBySubjectId(subjects);
    const normalized = normalizeEnrollmentMap(
      {
        '34': '21',
        '35': '4',
        '60': '7',
        random: 'x',
      },
      materiaIndex
    );

    expect(normalized).toEqual({
      '35': '4',
      '60': '7',
    });
  });

  it('aplica regla de inscripción reemplazando materia duplicada y permitiendo limpiar', () => {
    const materiaIndex = indexMateriaCodesBySubjectId(subjects);

    const replaced = applyEnrollmentRule(
      {
        '34': '21',
        '60': '7',
      },
      '35',
      '4',
      materiaIndex
    );
    expect(replaced).toEqual({ '35': '4', '60': '7' });

    const cleared = applyEnrollmentRule(replaced, '35', undefined, materiaIndex);
    expect(cleared).toEqual({ '60': '7' });
  });
});
