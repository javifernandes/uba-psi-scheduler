import { describe, expect, it } from 'vitest';
import type { ParsedSubject, SubjectData } from '@/components/scheduler/scheduler.types';
import {
  buildProjectedEnrollments,
  buildSavedConflicts,
  buildSavedElectionDetails,
  buildSavedSlotsForConflictAnalysis,
  validateImportPreview,
} from './saved-elections';

const subjects: SubjectData[] = [
  {
    id: '34',
    label: '(1) Historia de la Psicología - Cátedra 34 (II)',
    header: 'header 34',
    teoricos: [],
    seminarios: [],
    comisiones: [],
  },
  {
    id: '36',
    label: '(2) Psicología Social - Cátedra 36 (I)',
    header: 'header 36',
    teoricos: [],
    seminarios: [],
    comisiones: [],
  },
];

const parsedSubjects: ParsedSubject[] = [
  {
    id: '34',
    label: '(1) Historia de la Psicología - Cátedra 34 (II)',
    header: 'header 34',
    teoricos: [],
    seminarios: [],
    comisiones: [
      {
        id: '21',
        dia: 'lunes',
        inicio: '10:00',
        fin: '12:00',
        profesor: 'A',
        oblig: 'I',
        aula: 'IN-101',
        observ: '',
        vacantes: 20,
      },
    ],
    teoricoMap: {},
    seminarioMap: {},
  },
  {
    id: '36',
    label: '(2) Psicología Social - Cátedra 36 (I)',
    header: 'header 36',
    teoricos: [],
    seminarios: [],
    comisiones: [
      {
        id: '7',
        dia: 'lunes',
        inicio: '11:00',
        fin: '13:00',
        profesor: 'B',
        oblig: 'I',
        aula: 'HY-201',
        observ: '',
        vacantes: 15,
      },
    ],
    teoricoMap: {},
    seminarioMap: {},
  },
];

describe('saved elections domain', () => {
  it('genera proyección de cátedra/comisión desde elecciones guardadas', () => {
    const projected = buildProjectedEnrollments({ '34': '21' }, subjects);
    expect(projected).toEqual([{ catedra: 34, comision: 21 }]);
  });

  it('valida preview de importación no mapeable', () => {
    expect(() =>
      validateImportPreview({
        period: '2026-01',
        totalEntries: 1,
        mapped: [],
        rejected: [],
        mappedBySubject: {},
      })
    ).toThrow(/No se pudo mapear ninguna elección/);
  });

  it('construye detalles y conflictos de elecciones guardadas', () => {
    const details = buildSavedElectionDetails(parsedSubjects, { '34': '21', '36': '7' }, subjects);
    expect(details).toHaveLength(2);
    const slots = buildSavedSlotsForConflictAnalysis(details);
    const conflicts = buildSavedConflicts(slots);
    expect(Object.keys(conflicts)).not.toHaveLength(0);
  });
});
