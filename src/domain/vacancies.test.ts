import { describe, expect, it } from 'vitest';
import type { SubjectData } from '@/components/scheduler/scheduler.types';
import { sumKnownVacancies, sumKnownVacanciesFromSubject } from './vacancies';

describe('vacancies domain', () => {
  it('suma vacantes conocidas en un conjunto de comisiones', () => {
    expect(
      sumKnownVacancies([{ vacantes: 12 }, { vacantes: 0 }, { vacantes: null }, { vacantes: 7 }])
    ).toBe(19);
  });

  it('suma vacantes conocidas de una materia ignorando slots no prácticos', () => {
    const subject: SubjectData = {
      schemaVersion: 2,
      id: '35',
      label: '(2) Psicología Social - Cátedra 35 (I)',
      header: 'header',
      slots: [
        {
          tipo: 'teo',
          id: 'I',
          dia: 'lunes',
          inicio: '08:00',
          fin: '09:30',
          profesor: 'Teorico',
          lugar: { anexo: 'IN', aula: '111' },
        },
        {
          tipo: 'prac',
          id: '1',
          dia: 'martes',
          inicio: '09:00',
          fin: '10:30',
          profesor: 'Comision 1',
          lugar: { anexo: 'IN', aula: '101' },
          vacantes: 9,
          slotsAsociados: [{ slotId: 'I', rol: 'teo', condicion: 'obligatorio' }],
        },
        {
          tipo: 'prac',
          id: '2',
          dia: 'miercoles',
          inicio: '11:00',
          fin: '12:30',
          profesor: 'Comision 2',
          lugar: { anexo: 'SI', aula: '12' },
          vacantes: null,
          slotsAsociados: [{ slotId: 'I', rol: 'teo', condicion: 'obligatorio' }],
        },
      ],
    };

    expect(sumKnownVacanciesFromSubject(subject)).toBe(9);
  });
});
