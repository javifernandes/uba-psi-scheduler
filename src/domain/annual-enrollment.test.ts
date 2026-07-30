import { describe, expect, it } from 'vitest';
import type { SubjectData } from '@/components/scheduler/scheduler.types';
import {
  buildAnnualCarryOver,
  isAnnualSubject,
  previousPeriodForAnnualCarryOver,
} from './annual-enrollment';

const subject = (id: string, catedra: number, commissionId = '1'): SubjectData => ({
  schemaVersion: 2,
  id,
  label: `(12) Materia - Cátedra ${catedra} (I)`,
  header: `Materia - Cátedra ${catedra}`,
  slots: [
    {
      tipo: 'prac',
      id: commissionId,
      dia: 'lunes',
      inicio: '10:00',
      fin: '12:00',
      profesor: 'Docente',
      lugar: { anexo: 'IN', aula: '1' },
      vacantes: null,
      slotsAsociados: [],
    },
  ],
});

describe('annual enrollment carry-over', () => {
  it('sólo vincula el segundo cuatrimestre con el primero del mismo año', () => {
    expect(previousPeriodForAnnualCarryOver('2026-02')).toBe('2026-01');
    expect(previousPeriodForAnnualCarryOver('2026-01')).toBeNull();
  });

  it.each([37, 38, 49, 50])('reconoce la cátedra anual %s de Psicología', (catedra) => {
    expect(isAnnualSubject('lic-psicologia', subject(String(catedra), catedra))).toBe(true);
  });

  it('no infiere anualidad por aparecer en ambas ofertas', () => {
    expect(isAnnualSubject('lic-terapia-ocupacional', subject('401', 401))).toBe(false);
    expect(isAnnualSubject('lic-psicologia', subject('34', 34))).toBe(false);
  });

  it('arrastra únicamente elecciones anuales con una comisión todavía reconstruible', () => {
    const annual = subject('37-psicopatologia-c37-i', 37, '4');
    const semester = subject('34-historia-c34-ii', 34, '2');

    expect(
      buildAnnualCarryOver({
        careerSlug: 'lic-psicologia',
        previousSubjects: [annual, semester],
        previousEnrollments: {
          [annual.id]: '4',
          [semester.id]: '2',
        },
      })
    ).toEqual({
      subjects: [annual],
      enrollments: { [annual.id]: '4' },
    });
  });
});
