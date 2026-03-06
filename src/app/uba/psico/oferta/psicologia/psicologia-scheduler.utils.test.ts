import { describe, expect, it } from 'vitest';
import {
  catedraFragmentFromLabel,
  catedraNumberFromLabel,
  commissionSummaryLabel,
  catedraProfessorFromHeader,
  dayShort,
  h2m,
  m2h,
  materiaCodeFromLabel,
  materiaGroupFromLabel,
  matchesCommissionQuery,
  overlapRange,
  parseSubject,
  rangesOverlap,
  sameRecord,
  sameSetValues,
  shortTeacherName,
  slotKeyForEvent,
  sortComisiones,
  splitAula,
  splitEventTitle,
  venueCodeFromAula,
} from './psicologia-scheduler.utils';
import type { SubjectData } from './psicologia-scheduler.types';

const subjectData: SubjectData = {
  id: '50',
  label: '(16) Psicoanálisis Freud - Cátedra 50 (II)',
  header: 'Lic Psicología - Cátedra 50 - II - Laznik',
  teoricos: ['II|jueves|09:15|10:45|Láznik, David Alberto|IN-MAY|'],
  seminarios: ['B|martes|09:15|10:45|Battaglia, Gabriel German|HY-005|'],
  comisiones: ['63|martes|07:30|09:00|BLANK, Sofia|III - B|IN-123|'],
};

describe('psicologia-scheduler.utils', () => {
  it('convierte horas y calcula overlap', () => {
    expect(h2m('14:30')).toBe(870);
    expect(m2h(870)).toBe('14:30');
    expect(overlapRange('14:30', '16:00', '15:00', '17:00')).toEqual({
      start: '15:00',
      end: '16:00',
    });
    expect(rangesOverlap('14:30', '16:00', '16:00', '17:00')).toBe(false);
    expect(rangesOverlap('14:30', '16:00', '15:59', '17:00')).toBe(true);
  });

  it('parsea materia y referencias de teoría/seminario correctamente', () => {
    const parsed = parseSubject(subjectData);
    expect(parsed.id).toBe('50');
    expect(parsed.teoricos[0]?.id).toBe('II');
    expect(parsed.seminarios[0]?.id).toBe('B');
    expect(parsed.comisiones[0]).toMatchObject({
      id: '63',
      teoricoId: 'III',
      seminarioId: 'B',
      aula: 'IN-123',
    });
    expect(parsed.seminarioMap.B?.profesor).toContain('Battaglia');
  });

  it('resuelve metadatos de labels/header y códigos', () => {
    expect(materiaGroupFromLabel(subjectData.label)).toEqual({
      key: '16',
      label: '(16) Psicoanálisis Freud',
    });
    expect(materiaCodeFromLabel(subjectData.label)).toBe('16');
    expect(catedraFragmentFromLabel(subjectData.label)).toBe('Cátedra 50 (II)');
    expect(catedraNumberFromLabel(subjectData.label)).toBe(50);
    expect(catedraProfessorFromHeader(subjectData.header)).toBe('Laznik');
    expect(dayShort('miercoles')).toBe('Mié');
  });

  it('resuelve sedes/split/title y resumen de comisión', () => {
    expect(venueCodeFromAula('IN-123')).toBe('IN');
    expect(venueCodeFromAula('HY-005')).toBe('HY');
    expect(venueCodeFromAula('ZZ-1')).toBe('OTRO');
    expect(splitAula('IN-123')).toEqual({ prefix: 'IN', room: '123' });
    expect(splitEventTitle('63 - BLANK Sofia')).toEqual({
      code: '63',
      label: 'BLANK Sofia',
    });
    expect(commissionSummaryLabel(parseSubject(subjectData).comisiones[0]!)).toBe(
      '63 BLANK, Sofia'
    );
    expect(
      slotKeyForEvent({
        tipo: 'prac',
        id: 'prac-63',
        dia: 'martes',
        inicio: '07:30',
        fin: '09:00',
        aula: 'IN-123',
        title: '63 - BLANK Sofia',
        sourceSubjectId: '50',
        sourceSubjectLabel: subjectData.label,
      })
    ).toBe('martes|07:30|09:00');
  });

  it('normaliza nombres, query matching, orden de comisiones y comparadores', () => {
    expect(shortTeacherName('Láznik,   David   Alberto', 12)).toBe('Láznik Davi…');
    const [commission] = parseSubject(subjectData).comisiones;
    expect(matchesCommissionQuery(commission!, 'martes')).toBe(true);
    expect(matchesCommissionQuery(commission!, 'MART')).toBe(true);
    expect(matchesCommissionQuery(commission!, 'zzzzz')).toBe(false);

    const sorted = sortComisiones([
      { ...commission!, id: '2', dia: 'viernes', inicio: '09:00' },
      { ...commission!, id: '1', dia: 'lunes', inicio: '10:00' },
      { ...commission!, id: '3', dia: 'lunes', inicio: '08:00' },
    ]);
    expect(sorted.map(item => item.id)).toEqual(['3', '1', '2']);

    expect(sameSetValues(new Set(['IN', 'HY']), new Set(['HY', 'IN']))).toBe(true);
    expect(sameSetValues(new Set(['IN']), new Set(['HY']))).toBe(false);
    expect(sameRecord({ a: '1', b: '2' }, { b: '2', a: '1' })).toBe(true);
    expect(sameRecord({ a: '1' }, { a: '2' })).toBe(false);
  });
});
