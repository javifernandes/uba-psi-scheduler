import type { Day, SavedElectionDetail, SlotTipo } from '@/components/scheduler/scheduler.types';
import {
  DAYS,
  compactLugarLabel,
  h2m,
  shortTeacherName,
} from '@/components/scheduler/scheduler.utils';

export type SavedElectionViewMode = 'subject' | 'day';

export type SavedElectionRow = {
  key: string;
  subjectId: string;
  subjectLabel: string;
  kind: SlotTipo;
  code: string;
  profesor: string;
  day: Day;
  start: string;
  end: string;
  venue: string;
  teacherLabel: string;
};

export type SavedElectionSubjectGroup = {
  subjectId: string;
  subjectLabel: string;
  commissionId: string;
  commissionVacancies: number | null;
  rows: SavedElectionRow[];
};

export type SavedElectionDayGroup = {
  day: Day;
  rows: SavedElectionRow[];
};

const SLOT_KIND_ORDER: Record<SlotTipo, number> = {
  teo: 0,
  sem: 1,
  prac: 2,
};

const sortSavedElectionRows = (rows: SavedElectionRow[]) =>
  [...rows].sort((a, b) => {
    const dayDiff = DAYS.indexOf(a.day) - DAYS.indexOf(b.day);
    if (dayDiff !== 0) return dayDiff;
    const startDiff = h2m(a.start) - h2m(b.start);
    if (startDiff !== 0) return startDiff;
    const endDiff = h2m(a.end) - h2m(b.end);
    if (endDiff !== 0) return endDiff;
    const kindDiff = SLOT_KIND_ORDER[a.kind] - SLOT_KIND_ORDER[b.kind];
    if (kindDiff !== 0) return kindDiff;
    return a.code.localeCompare(b.code, 'es');
  });

const buildRowsForSubject = (item: SavedElectionDetail): SavedElectionRow[] => {
  const rows: SavedElectionRow[] = [
    {
      key: `${item.subject.id}|prac|${item.commission.id}`,
      subjectId: item.subject.id,
      subjectLabel: item.subject.label,
      kind: 'prac',
      code: item.commission.id,
      profesor: item.commission.profesor,
      day: item.commission.dia,
      start: item.commission.inicio,
      end: item.commission.fin,
      venue: compactLugarLabel(item.commission.lugar),
      teacherLabel: shortTeacherName(item.commission.profesor, 24),
    },
  ];

  if (item.teorico) {
    rows.push({
      key: `${item.subject.id}|teo|${item.teorico.id}`,
      subjectId: item.subject.id,
      subjectLabel: item.subject.label,
      kind: 'teo',
      code: item.teorico.id,
      profesor: item.teorico.profesor,
      day: item.teorico.dia,
      start: item.teorico.inicio,
      end: item.teorico.fin,
      venue: compactLugarLabel(item.teorico.lugar),
      teacherLabel: shortTeacherName(item.teorico.profesor, 24),
    });
  }

  if (item.seminario) {
    rows.push({
      key: `${item.subject.id}|sem|${item.seminario.id}`,
      subjectId: item.subject.id,
      subjectLabel: item.subject.label,
      kind: 'sem',
      code: item.seminario.id,
      profesor: item.seminario.profesor,
      day: item.seminario.dia,
      start: item.seminario.inicio,
      end: item.seminario.fin,
      venue: compactLugarLabel(item.seminario.lugar),
      teacherLabel: shortTeacherName(item.seminario.profesor, 24),
    });
  }

  return sortSavedElectionRows(rows);
};

export const buildSavedElectionRows = (savedElectionDetails: SavedElectionDetail[]) =>
  sortSavedElectionRows(savedElectionDetails.flatMap(buildRowsForSubject));

export const groupSavedElectionRowsBySubject = (savedElectionDetails: SavedElectionDetail[]) =>
  savedElectionDetails.map((item) => ({
    subjectId: item.subject.id,
    subjectLabel: item.subject.label,
    commissionId: item.commission.id,
    commissionVacancies: item.commission.vacantes,
    rows: buildRowsForSubject(item),
  }));

export const groupSavedElectionRowsByDay = (rows: SavedElectionRow[]) =>
  DAYS.reduce<SavedElectionDayGroup[]>((groups, day) => {
    const dayRows = rows.filter((row) => row.day === day);
    if (dayRows.length === 0) return groups;
    groups.push({ day, rows: dayRows });
    return groups;
  }, []);
