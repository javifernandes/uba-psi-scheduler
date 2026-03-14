import { describe, expect, it } from 'vitest';
import type { SubjectData } from '@/components/scheduler/scheduler.types';
import { indexMaterias, materiaCodeFromLabel } from './materia';

const subjects: SubjectData[] = [
  {
    schemaVersion: 2,
    id: '34',
    label: '(2) Psicología Social - Cátedra 34 (II)',
    header: 'h34',
    slots: [],
  },
  {
    schemaVersion: 2,
    id: '60',
    label: '(10) Estadística - Cátedra 60 (I)',
    header: 'h60',
    slots: [],
  },
];

describe('materia domain', () => {
  it('extrae código de materia desde label', () => {
    expect(materiaCodeFromLabel(subjects[0].label)).toBe('2');
    expect(materiaCodeFromLabel('Materia libre')).toBe('Materia libre');
  });

  it('indexa códigos de materia por subjectId', () => {
    expect(indexMaterias(subjects)).toEqual({
      '34': '2',
      '60': '10',
    });
  });
});
