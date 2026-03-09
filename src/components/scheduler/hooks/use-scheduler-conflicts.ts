import { useMemo } from 'react';
import type {
  CalendarEvent,
  ParsedSubject,
  ReservedSlot,
  SavedElectionDetail,
  SubjectData,
} from '../psicologia-scheduler.types';
import { rangesOverlap, shortTeacherName, splitAula } from '../psicologia-scheduler.utils';

type UseSchedulerConflictsParams = {
  savedSubjects: SubjectData[];
  parsedSubjects: ParsedSubject[];
  enrolledBySubject: Record<string, string>;
  selectedSubjectId: string;
  events: CalendarEvent[];
  hoveredConflictEventId: string | null;
};

export const useSchedulerConflicts = ({
  savedSubjects,
  parsedSubjects,
  enrolledBySubject,
  selectedSubjectId,
  events,
  hoveredConflictEventId,
}: UseSchedulerConflictsParams) => {
  const savedElectionDetails = useMemo<SavedElectionDetail[]>(() => {
    const built: SavedElectionDetail[] = [];
    savedSubjects.forEach(subject => {
      const parsed = parsedSubjects.find(item => item.id === subject.id);
      const commissionId = enrolledBySubject[subject.id];
      if (!parsed || !commissionId) return;
      const c = parsed.comisiones.find(item => item.id === commissionId);
      if (!c) return;
      built.push({
        subject,
        commission: c,
        teorico: c.teoricoId ? parsed.teoricoMap[c.teoricoId] : undefined,
        seminario: c.seminarioId ? parsed.seminarioMap[c.seminarioId] : undefined,
      });
    });
    return built;
  }, [savedSubjects, parsedSubjects, enrolledBySubject]);

  const savedSlotsForConflictAnalysis = useMemo(() => {
    const savedSlots: ReservedSlot[] = [];
    savedElectionDetails.forEach(item => {
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
  }, [savedElectionDetails]);

  const savedConflictDetailsBySlot = useMemo(() => {
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
  }, [savedSlotsForConflictAnalysis]);

  const alwaysConflictingSavedSlotIds = useMemo(
    () => new Set(Object.keys(savedConflictDetailsBySlot)),
    [savedConflictDetailsBySlot]
  );

  const reservedSlotsFromOtherSubjects = useMemo<ReservedSlot[]>(() => {
    const reserved: ReservedSlot[] = [];
    parsedSubjects
      .filter(subject => subject.id !== selectedSubjectId)
      .forEach(subject => {
        const commissionId = enrolledBySubject[subject.id];
        if (!commissionId) return;
        const c = subject.comisiones.find(item => item.id === commissionId);
        if (!c) return;
        reserved.push({
          slotId: `${subject.id}|prac|${c.id}`,
          subjectId: subject.id,
          subjectLabel: subject.label,
          slotKind: 'Comisión',
          slotCode: c.id,
          venue: splitAula(c.aula).prefix,
          day: c.dia,
          start: c.inicio,
          end: c.fin,
          title: `${c.id} - ${shortTeacherName(c.profesor, 30)}`,
        });
        const t = c.teoricoId ? subject.teoricoMap[c.teoricoId] : undefined;
        if (t) {
          reserved.push({
            slotId: `${subject.id}|teo|${t.id}`,
            subjectId: subject.id,
            subjectLabel: subject.label,
            slotKind: 'Teórico',
            slotCode: t.id,
            venue: splitAula(t.aula).prefix,
            day: t.dia,
            start: t.inicio,
            end: t.fin,
            title: `${t.id} - ${shortTeacherName(t.profesor, 30)}`,
          });
        }
        const s = c.seminarioId ? subject.seminarioMap[c.seminarioId] : undefined;
        if (s) {
          reserved.push({
            slotId: `${subject.id}|sem|${s.id}`,
            subjectId: subject.id,
            subjectLabel: subject.label,
            slotKind: 'Seminario',
            slotCode: s.id,
            venue: splitAula(s.aula).prefix,
            day: s.dia,
            start: s.inicio,
            end: s.fin,
            title: `${s.id} - ${shortTeacherName(s.profesor, 30)}`,
          });
        }
      });
    return reserved;
  }, [parsedSubjects, selectedSubjectId, enrolledBySubject]);

  const conflictByEventId = useMemo(() => {
    const byEvent: Record<string, ReservedSlot[]> = {};
    events.forEach(event => {
      if (event.isExternal || event.sourceSubjectId !== selectedSubjectId) return;
      const clashes = reservedSlotsFromOtherSubjects.filter(
        slot =>
          slot.day === event.dia && rangesOverlap(event.inicio, event.fin, slot.start, slot.end)
      );
      if (clashes.length) byEvent[event.id] = clashes;
    });
    return byEvent;
  }, [events, reservedSlotsFromOtherSubjects, selectedSubjectId]);

  const highlightedConflictSlotIds = useMemo(() => {
    if (!hoveredConflictEventId) return new Set<string>();
    return new Set((conflictByEventId[hoveredConflictEventId] || []).map(slot => slot.slotId));
  }, [hoveredConflictEventId, conflictByEventId]);

  return {
    savedElectionDetails,
    savedConflictDetailsBySlot,
    alwaysConflictingSavedSlotIds,
    conflictByEventId,
    highlightedConflictSlotIds,
  };
};
