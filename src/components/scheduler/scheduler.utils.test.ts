import { describe, expect, it } from 'vitest';
import {
  buildEnrollmentsExportPayload,
  ENROLLMENTS_EXPORT_TYPE,
  buildLinkedCommissionIdsMap,
  catedraFragmentFromLabel,
  catedraNumberFromLabel,
  commissionSummaryLabel,
  catedraProfessorFromHeader,
  dayShort,
  displayHeaderLabel,
  displaySubjectLabel,
  enrollmentStorageKeyForScope,
  h2m,
  m2h,
  materiaCodeFromLabel,
  materiaGroupFromLabel,
  mapProjectionEnrollmentsToSubjectMap,
  matchesCommissionQuery,
  overlapRange,
  parseEnrollmentsImportPayload,
  parseSubject,
  rangesOverlap,
  sameRecord,
  sameSetValues,
  shortTeacherName,
  sortVenueCodes,
  slotKeyForEvent,
  sortComisiones,
  splitAula,
  splitEventTitle,
  venueLabel,
  venueCodeFromAula,
} from './scheduler.utils';
import type { SubjectData } from './scheduler.types';
import { subjectFromLegacyFixture } from '@/test/subject-fixture';

const subjectData: SubjectData = subjectFromLegacyFixture({
  id: '50',
  label: '(16) Psicoanálisis Freud - Cátedra 50 (II)',
  header: 'Lic Psicología - Cátedra 50 - II - Laznik',
  teoricos: ['II|jueves|09:15|10:45|Láznik, David Alberto|IN-MAY|'],
  seminarios: ['B|martes|09:15|10:45|Battaglia, Gabriel German|HY-005|'],
  comisiones: ['63|martes|07:30|09:00|BLANK, Sofia|III - B|IN-123||35'],
});

const subjectOnlyTeoricoObligData: SubjectData = subjectFromLegacyFixture({
  id: '48',
  label: '(15) Neurofisiología - Cátedra 48 (I)',
  header: 'Psicología UBA - (15) Neurofisiología - Cátedra 48 - I - China',
  teoricos: ['V|martes|18:00|19:30|China, Norma Nancy|HY-014|'],
  seminarios: [],
  comisiones: ['14|sabado|09:15|10:45|García, Adriana Verónica|V|IN-207||'],
});

const secondarySubjectData: SubjectData = subjectFromLegacyFixture({
  id: '36',
  label: '(2) Psicología Social - Cátedra 36 (II)',
  header: 'Psicología UBA - (2) Psicología Social - Cátedra 36 - II - Zubieta',
  teoricos: [],
  seminarios: [],
  comisiones: ['9|jueves|16:15|19:30|Fazzito, Lorena Laura|II|IN-208|'],
});

describe('scheduler.utils', () => {
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
      slotsAsociados: [
        { slotId: 'B', rol: 'sem', condicion: 'obligatorio' },
        { slotId: 'III', rol: 'teo', condicion: 'obligatorio' },
      ],
      aula: 'IN-123',
      vacantes: 35,
    });
    expect(parsed.seminarioMap.B?.profesor).toContain('Battaglia');
  });

  it('parsea oblig con solo teórico sin inyectar seminario indefinido', () => {
    const parsed = parseSubject(subjectOnlyTeoricoObligData);
    expect(parsed.comisiones[0]).toMatchObject({
      slotsAsociados: [{ slotId: 'V', rol: 'teo', condicion: 'obligatorio' }],
      vacantes: null,
    });
  });

  it('resuelve metadatos de labels/header y códigos', () => {
    expect(materiaGroupFromLabel(subjectData.label)).toEqual({
      key: '16',
      label: '16 · Psicoanálisis Freud',
    });
    expect(materiaCodeFromLabel(subjectData.label)).toBe('16');
    expect(catedraFragmentFromLabel(subjectData.label)).toBe('Cátedra 50 (II)');
    expect(catedraNumberFromLabel(subjectData.label)).toBe(50);
    expect(catedraProfessorFromHeader(subjectData.header)).toBe('Laznik');
    expect(dayShort('miercoles')).toBe('Mié');
    expect(displaySubjectLabel(subjectData.label)).toBe(
      '16 · Psicoanálisis Freud - Cátedra 50 (II)'
    );
    expect(
      displayHeaderLabel(
        'Psicología UBA - (1) Historia de la Psicología - Cátedra 34 - II - Ibarra'
      )
    ).toBe('Psicología UBA - 1 · Historia de la Psicología - Cátedra 34 - II - Ibarra');
  });

  it('resuelve sedes/split/title y resumen de comisión', () => {
    expect(venueCodeFromAula('IN-123')).toBe('IN');
    expect(venueCodeFromAula('HY-005')).toBe('HY');
    expect(venueCodeFromAula('ZZ-1')).toBe('ZZ');
    expect(venueCodeFromAula('AV 028')).toBe('AV');
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

  it('resuelve label y orden de sedes conocidas/desconocidas', () => {
    expect(venueLabel('IN')).toBe('Independencia');
    expect(venueLabel('AV')).toBe('Sede AV');
    expect(sortVenueCodes(['SI', 'AV', 'IN', 'OTRO', 'HY'])).toEqual([
      'IN',
      'HY',
      'SI',
      'AV',
      'OTRO',
    ]);
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
    expect(sorted.map((item) => item.id)).toEqual(['3', '1', '2']);

    expect(sameSetValues(new Set(['IN', 'HY']), new Set(['HY', 'IN']))).toBe(true);
    expect(sameSetValues(new Set(['IN']), new Set(['HY']))).toBe(false);
    expect(sameRecord({ a: '1', b: '2' }, { b: '2', a: '1' })).toBe(true);
    expect(sameRecord({ a: '1' }, { a: '2' })).toBe(false);
  });

  it('serializa y parsea export/import de elecciones con versionado', () => {
    const payload = buildEnrollmentsExportPayload([{ catedra: 36, comision: 9 }], '2026-01');
    const parsed = parseEnrollmentsImportPayload(JSON.stringify(payload));

    expect(parsed.version).toBe(1);
    expect(parsed.type).toBe(ENROLLMENTS_EXPORT_TYPE);
    expect(parsed.period).toBe('2026-01');
    expect(parsed.enrollments).toEqual([{ catedra: 36, comision: 9 }]);
    expect(() => parseEnrollmentsImportPayload('no-json')).toThrow(/JSON válido/);
    expect(() =>
      parseEnrollmentsImportPayload(
        JSON.stringify({
          version: 99,
          enrollments: {},
        })
      )
    ).toThrow(/no soportada/);
    expect(enrollmentStorageKeyForScope('lic-psicologia', '2026-01')).toBe(
      'uba_psico_planner_v1:lic-psicologia:2026-01'
    );
  });

  it('mapea proyección importada a elecciones por subject id', () => {
    const mapped = mapProjectionEnrollmentsToSubjectMap(
      [
        { catedra: 36, comision: 9 },
        { catedra: 999, comision: 1 },
        { catedra: 36, comision: 999 },
      ],
      [subjectData, secondarySubjectData]
    );

    expect(mapped.mappedBySubject).toEqual({
      '36': '9',
    });
    expect(mapped.mapped).toHaveLength(1);
    expect(mapped.rejected).toHaveLength(2);
  });

  it('agrupa todas las comisiones asociadas a un mismo teórico o seminario', () => {
    const parsed = parseSubject({
      schemaVersion: 2,
      id: 'shared',
      label: '(99) Materia de prueba - Cátedra 1 (I)',
      header: 'header',
      slots: subjectFromLegacyFixture({
        id: 'shared',
        label: '(99) Materia de prueba - Cátedra 1 (I)',
        header: 'header',
        teoricos: ['T1|lunes|08:00|09:00|Docente T1|IN-100|'],
        seminarios: ['S1|martes|08:00|09:00|Docente S1|IN-101|'],
        comisiones: [
          '11|miercoles|08:00|09:00|Com A|T1 - S1|IN-201|',
          '12|miercoles|09:00|10:00|Com B|T1 - S1|IN-202|',
          '13|jueves|08:00|09:00|Com C|T1|IN-203|',
        ],
      }).slots,
    });

    expect(buildLinkedCommissionIdsMap(parsed.comisiones, 'teo')).toEqual({
      T1: ['11', '12', '13'],
    });
    expect(buildLinkedCommissionIdsMap(parsed.comisiones, 'sem')).toEqual({
      S1: ['11', '12'],
    });
  });
});
