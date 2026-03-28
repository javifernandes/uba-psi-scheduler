import { describe, expect, it } from 'vitest';
import type { SavedElectionDetail, SubjectData } from '@/components/scheduler/scheduler.types';
import {
  buildSavedElectionRows,
  groupSavedElectionRowsByDay,
  groupSavedElectionRowsBySubject,
} from './saved-election-views';

const subjectA: SubjectData = {
  schemaVersion: 2,
  id: '34',
  label: '(1) Historia de la Psicología - Cátedra 34 (II)',
  header: 'header 34',
  slots: [],
};

const subjectB: SubjectData = {
  schemaVersion: 2,
  id: '36',
  label: '(2) Psicología Social - Cátedra 36 (I)',
  header: 'header 36',
  slots: [],
};

const savedElectionDetails: SavedElectionDetail[] = [
  {
    subject: subjectA,
    commission: {
      tipo: 'prac',
      id: '21',
      dia: 'jueves',
      inicio: '14:30',
      fin: '16:00',
      profesor: 'Cazes Marcela Adriana',
      lugar: { anexo: 'IN', aula: '444' },
      slotsAsociados: [],
      vacantes: 18,
    },
    teorico: {
      tipo: 'teo',
      id: 'II',
      dia: 'jueves',
      inicio: '12:45',
      fin: '14:15',
      profesor: 'Ibarra Maria Florencia',
      lugar: { anexo: 'IN', aula: '201' },
    },
    seminario: {
      tipo: 'sem',
      id: 'C',
      dia: 'miercoles',
      inicio: '14:30',
      fin: '16:00',
      profesor: 'Rodriguez Sturla Pablo',
      lugar: { anexo: 'HY', aula: '005' },
    },
  },
  {
    subject: subjectB,
    commission: {
      tipo: 'prac',
      id: '7',
      dia: 'martes',
      inicio: '09:15',
      fin: '10:45',
      profesor: 'Ferrari Maria Laura',
      lugar: { anexo: 'SI', aula: '12' },
      slotsAsociados: [],
      vacantes: 9,
    },
  },
];

describe('saved-election-views', () => {
  it('construye filas planas ordenadas por día y horario', () => {
    const rows = buildSavedElectionRows(savedElectionDetails);

    expect(rows.map((row) => row.key)).toEqual([
      '36|prac|7',
      '34|sem|C',
      '34|teo|II',
      '34|prac|21',
    ]);
    expect(rows[0]).toMatchObject({
      venue: 'SI 12',
      teacherLabel: 'Ferrari Maria Laura',
    });
  });

  it('agrupa por materia conservando filas ordenadas y vacantes de comisión', () => {
    const groups = groupSavedElectionRowsBySubject(savedElectionDetails);

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      subjectId: '34',
      commissionVacancies: 18,
    });
    expect(groups[0]?.rows.map((row) => row.key)).toEqual(['34|sem|C', '34|teo|II', '34|prac|21']);
  });

  it('agrupa por día en orden calendario y omite días vacíos', () => {
    const rows = buildSavedElectionRows(savedElectionDetails);
    const groups = groupSavedElectionRowsByDay(rows);

    expect(groups.map((group) => group.day)).toEqual(['martes', 'miercoles', 'jueves']);
    expect(groups[2]?.rows.map((row) => row.key)).toEqual(['34|teo|II', '34|prac|21']);
  });
});
