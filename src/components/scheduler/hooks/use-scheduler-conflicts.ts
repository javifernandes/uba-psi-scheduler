import { useMemo } from 'react';
import type { CalendarEvent, ParsedSubject, ReservedSlot, SubjectData } from '../scheduler.types';
import {
  buildSavedConflicts,
  buildSavedElectionDetails,
  buildSavedSlotsForConflictAnalysis,
} from '@/domain/saved-elections';
import { rangesOverlap, shortTeacherName, splitAula } from '../scheduler.utils';

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
  const savedElectionDetails = useMemo(
    () => buildSavedElectionDetails(parsedSubjects, enrolledBySubject, savedSubjects),
    [enrolledBySubject, parsedSubjects, savedSubjects]
  );

  const savedSlotsForConflictAnalysis = useMemo(
    () => buildSavedSlotsForConflictAnalysis(savedElectionDetails),
    [savedElectionDetails]
  );

  const savedConflictDetailsBySlot = useMemo(
    () => buildSavedConflicts(savedSlotsForConflictAnalysis),
    [savedSlotsForConflictAnalysis]
  );

  const alwaysConflictingSavedSlotIds = useMemo(
    () => new Set(Object.keys(savedConflictDetailsBySlot)),
    [savedConflictDetailsBySlot]
  );

  const reservedSlotsFromOtherSubjects = useMemo<ReservedSlot[]>(() => {
    const reserved: ReservedSlot[] = [];
    parsedSubjects
      .filter((subject) => subject.id !== selectedSubjectId)
      .forEach((subject) => {
        const commissionId = enrolledBySubject[subject.id];
        if (!commissionId) return;
        const c = subject.comisiones.find((item) => item.id === commissionId);
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
    events.forEach((event) => {
      if (event.isExternal || event.sourceSubjectId !== selectedSubjectId) return;
      const clashes = reservedSlotsFromOtherSubjects.filter(
        (slot) =>
          slot.day === event.dia && rangesOverlap(event.inicio, event.fin, slot.start, slot.end)
      );
      if (clashes.length) byEvent[event.id] = clashes;
    });
    return byEvent;
  }, [events, reservedSlotsFromOtherSubjects, selectedSubjectId]);

  const highlightedConflictSlotIds = useMemo(() => {
    if (!hoveredConflictEventId) return new Set<string>();
    return new Set((conflictByEventId[hoveredConflictEventId] || []).map((slot) => slot.slotId));
  }, [hoveredConflictEventId, conflictByEventId]);

  return {
    savedElectionDetails,
    savedConflictDetailsBySlot,
    alwaysConflictingSavedSlotIds,
    conflictByEventId,
    highlightedConflictSlotIds,
  };
};
