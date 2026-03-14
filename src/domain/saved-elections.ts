import type {
  ParsedSubject,
  ReservedSlot,
  SavedElectionDetail,
  SubjectData,
} from '@/components/scheduler/scheduler.types';
import {
  catedraNumberFromLabel,
  findPrimaryAssociatedSlotId,
  rangesOverlap,
  shortTeacherName,
  splitAula,
  type EnrollmentProjectionEntry,
  type EnrollmentProjectionMappedEntry,
  type EnrollmentProjectionRejectedEntry,
} from '@/components/scheduler/scheduler.utils';

export type SavedElectionsImportPreview = {
  period: string;
  totalEntries: number;
  mapped: EnrollmentProjectionMappedEntry[];
  rejected: EnrollmentProjectionRejectedEntry[];
  mappedBySubject: Record<string, string>;
};

export const buildProjectedEnrollments = (
  enrolledBySubject: Record<string, string>,
  subjects: SubjectData[]
): EnrollmentProjectionEntry[] =>
  Object.entries(enrolledBySubject).reduce<Array<{ catedra: number; comision: number | string }>>(
    (acc, [subjectId, commissionId]) => {
      const subject = subjects.find((item) => item.id === subjectId);
      if (!subject) return acc;
      const catedra = catedraNumberFromLabel(subject.label);
      if (!Number.isFinite(catedra)) return acc;
      acc.push({
        catedra,
        comision: /^\d+$/.test(commissionId) ? Number.parseInt(commissionId, 10) : commissionId,
      });
      return acc;
    },
    []
  );

export const validateImportPreview = (preview: SavedElectionsImportPreview) => {
  if (preview.totalEntries > 0 && Object.keys(preview.mappedBySubject).length === 0) {
    throw new Error(
      'No se pudo mapear ninguna elección. Verificá que el archivo corresponda a esta oferta/carrera.'
    );
  }
};

export const buildSavedElectionDetails = (
  parsedSubjects: ParsedSubject[],
  enrolledBySubject: Record<string, string>,
  subjects: SubjectData[]
) => {
  const savedSubjects = subjects.filter((subject) => enrolledBySubject[subject.id]);
  const built: SavedElectionDetail[] = [];
  savedSubjects.forEach((subject) => {
    const parsed = parsedSubjects.find((item) => item.id === subject.id);
    const commissionId = enrolledBySubject[subject.id];
    if (!parsed || !commissionId) return;
    const c = parsed.comisiones.find((item) => item.id === commissionId);
    if (!c) return;
    const teoricoId = findPrimaryAssociatedSlotId(c, 'teo');
    const seminarioId = findPrimaryAssociatedSlotId(c, 'sem');
    built.push({
      subject,
      commission: c,
      teorico: teoricoId ? parsed.teoricoMap[teoricoId] : undefined,
      seminario: seminarioId ? parsed.seminarioMap[seminarioId] : undefined,
    });
  });
  return built;
};

export const buildSavedSlotsForConflictAnalysis = (savedElectionDetails: SavedElectionDetail[]) => {
  const savedSlots: ReservedSlot[] = [];
  savedElectionDetails.forEach((item) => {
    savedSlots.push({
      slotId: `${item.subject.id}|prac|${item.commission.id}`,
      subjectId: item.subject.id,
      subjectLabel: item.subject.label,
      slotKind: 'Comisión',
      slotCode: item.commission.id,
      venue: splitAula(item.commission.aula).prefix,
      day: item.commission.dia,
      start: item.commission.inicio,
      end: item.commission.fin,
      title: `${item.commission.id} - ${shortTeacherName(item.commission.profesor, 30)}`,
    });
    if (item.teorico) {
      savedSlots.push({
        slotId: `${item.subject.id}|teo|${item.teorico.id}`,
        subjectId: item.subject.id,
        subjectLabel: item.subject.label,
        slotKind: 'Teórico',
        slotCode: item.teorico.id,
        venue: splitAula(item.teorico.aula).prefix,
        day: item.teorico.dia,
        start: item.teorico.inicio,
        end: item.teorico.fin,
        title: `${item.teorico.id} - ${shortTeacherName(item.teorico.profesor, 30)}`,
      });
    }
    if (item.seminario) {
      savedSlots.push({
        slotId: `${item.subject.id}|sem|${item.seminario.id}`,
        subjectId: item.subject.id,
        subjectLabel: item.subject.label,
        slotKind: 'Seminario',
        slotCode: item.seminario.id,
        venue: splitAula(item.seminario.aula).prefix,
        day: item.seminario.dia,
        start: item.seminario.inicio,
        end: item.seminario.fin,
        title: `${item.seminario.id} - ${shortTeacherName(item.seminario.profesor, 30)}`,
      });
    }
  });
  return savedSlots;
};

export const buildSavedConflicts = (savedSlotsForConflictAnalysis: ReservedSlot[]) => {
  const bySlot: Record<string, ReservedSlot[]> = {};
  for (let i = 0; i < savedSlotsForConflictAnalysis.length; i += 1) {
    for (let j = i + 1; j < savedSlotsForConflictAnalysis.length; j += 1) {
      const a = savedSlotsForConflictAnalysis[i];
      const b = savedSlotsForConflictAnalysis[j];
      if (a.subjectId === b.subjectId) continue;
      if (a.day !== b.day) continue;
      if (!rangesOverlap(a.start, a.end, b.start, b.end)) continue;
      if (!bySlot[a.slotId]) bySlot[a.slotId] = [];
      if (!bySlot[b.slotId]) bySlot[b.slotId] = [];
      bySlot[a.slotId].push({
        slotId: b.slotId,
        subjectId: b.subjectId,
        subjectLabel: b.subjectLabel,
        slotKind: b.slotKind,
        slotCode: b.slotCode,
        venue: b.venue,
        day: b.day,
        start: b.start,
        end: b.end,
        title: b.title,
      });
      bySlot[b.slotId].push({
        slotId: a.slotId,
        subjectId: a.subjectId,
        subjectLabel: a.subjectLabel,
        slotKind: a.slotKind,
        slotCode: a.slotCode,
        venue: a.venue,
        day: a.day,
        start: a.start,
        end: a.end,
        title: a.title,
      });
    }
  }
  return bySlot;
};
