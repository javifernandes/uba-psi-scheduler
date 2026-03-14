import { describe, expect, it } from 'vitest';
import type { ParsedSubject, SubjectData } from '@/components/scheduler/scheduler.types';
import { parseSubject } from '@/components/scheduler/scheduler.utils';
import { subjectFromLegacyFixture } from '@/test/subject-fixture';
import {
  buildProjectedEnrollments,
  buildSavedConflicts,
  buildSavedElectionDetails,
  buildSavedSlotsForConflictAnalysis,
  validateImportPreview,
} from './saved-elections';

const subjects: SubjectData[] = [
  {
    schemaVersion: 2,
    id: '34',
    label: '(1) Historia de la Psicología - Cátedra 34 (II)',
    header: 'header 34',
    slots: [],
  },
  {
    schemaVersion: 2,
    id: '36',
    label: '(2) Psicología Social - Cátedra 36 (I)',
    header: 'header 36',
    slots: [],
  },
];

const parsedSubjects: ParsedSubject[] = [
  parseSubject(
    subjectFromLegacyFixture({
      id: '34',
      label: '(1) Historia de la Psicología - Cátedra 34 (II)',
      header: 'header 34',
      comisiones: ['21|lunes|10:00|12:00|A|I|IN-101||20'],
    })
  ),
  parseSubject(
    subjectFromLegacyFixture({
      id: '36',
      label: '(2) Psicología Social - Cátedra 36 (I)',
      header: 'header 36',
      comisiones: ['7|lunes|11:00|13:00|B|I|HY-201||15'],
    })
  ),
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
