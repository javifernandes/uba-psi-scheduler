import { useMemo } from 'react';
import type { CalendarEvent, ParsedSubject, Seminario, Teorico } from '../scheduler.types';
import {
  buildLinkedCommissionIdsMap,
  findPrimaryAssociatedSlotId,
  slotById,
  shortTeacherName,
  slotKeyForEvent,
} from '../scheduler.utils';

type UseSchedulerCalendarParams = {
  selectedSubject: ParsedSubject;
  enrolledBySubject: Record<string, string>;
  selectedComisiones: ParsedSubject['comisiones'];
  filteredTeoricos: Teorico[];
  filteredSeminarios: Seminario[];
  parsedSubjects: ParsedSubject[];
  showComisiones: boolean;
  showTeoricos: boolean;
  showSeminarios: boolean;
  showOtherSubjects: boolean;
  hoveredCommissionId: string | null;
  hoveredLinkedTeoricoId: string | null;
  hoveredLinkedSeminarioId: string | null;
  pinnedCommissionId: string | null;
  stackIndexBySlot: Record<string, number>;
};

type EventSubject = Pick<ParsedSubject, 'id' | 'label' | 'slotMap'>;

type EventOptions = {
  idPrefix?: string;
  isExternal?: boolean;
  linkedCommissionId?: string;
  linkedCommissionIds?: string[];
};

const matchesLinkedRoleSlot = (
  event: CalendarEvent,
  role: 'teo' | 'sem',
  slotId: string | undefined
) => event.linkedSlotRole === role && !!slotId && event.linkedSlotId === slotId;

const buildTitle = (id: string, profesor: string) => `${id} - ${shortTeacherName(profesor)}`;

const buildPracEvent = (
  subject: Pick<ParsedSubject, 'id' | 'label'>,
  commission: ParsedSubject['comisiones'][number],
  options: EventOptions = {}
): CalendarEvent => ({
  tipo: 'prac',
  id: `${options.idPrefix || ''}prac-${commission.id}`,
  dia: commission.dia,
  inicio: commission.inicio,
  fin: commission.fin,
  aula: commission.aula,
  title: buildTitle(commission.id, commission.profesor),
  linkedCommissionId: options.linkedCommissionId || commission.id,
  linkedCommissionIds: [options.linkedCommissionId || commission.id],
  sourceSubjectId: subject.id,
  sourceSubjectLabel: subject.label,
  isExternal: options.isExternal,
});

const buildTeoEvent = (
  subject: Pick<ParsedSubject, 'id' | 'label'>,
  teorico: Teorico,
  options: EventOptions & { linkedSlotId?: string } = {}
): CalendarEvent => ({
  tipo: 'teo',
  id: `${options.idPrefix || ''}teo-${teorico.id}`,
  dia: teorico.dia,
  inicio: teorico.inicio,
  fin: teorico.fin,
  aula: teorico.aula,
  title: buildTitle(teorico.id, teorico.profesor),
  linkedSlotId: options.linkedSlotId || teorico.id,
  linkedSlotRole: 'teo',
  linkedCommissionId: options.linkedCommissionId,
  linkedCommissionIds: options.linkedCommissionIds,
  sourceSubjectId: subject.id,
  sourceSubjectLabel: subject.label,
  isExternal: options.isExternal,
});

const buildSemEvent = (
  subject: Pick<ParsedSubject, 'id' | 'label'>,
  seminario: Seminario,
  options: EventOptions & { linkedSlotId?: string } = {}
): CalendarEvent => ({
  tipo: 'sem',
  id: `${options.idPrefix || ''}sem-${seminario.id}`,
  dia: seminario.dia,
  inicio: seminario.inicio,
  fin: seminario.fin,
  aula: seminario.aula,
  title: buildTitle(seminario.id, seminario.profesor),
  linkedSlotId: options.linkedSlotId || seminario.id,
  linkedSlotRole: 'sem',
  linkedCommissionId: options.linkedCommissionId,
  linkedCommissionIds: options.linkedCommissionIds,
  sourceSubjectId: subject.id,
  sourceSubjectLabel: subject.label,
  isExternal: options.isExternal,
});

const pushCommissionBundle = ({
  subject,
  commission,
  pushEvent,
  options = {},
}: {
  subject: EventSubject;
  commission: ParsedSubject['comisiones'][number];
  pushEvent: (event: CalendarEvent) => void;
  options?: EventOptions;
}) => {
  pushEvent(buildPracEvent(subject, commission, options));
  const teoricoId = findPrimaryAssociatedSlotId(commission, 'teo');
  const teoricoSlot = teoricoId ? slotById(subject, teoricoId) : undefined;
  const teorico = teoricoSlot?.tipo === 'teo' ? teoricoSlot : undefined;
  if (teorico) {
    pushEvent(
      buildTeoEvent(subject, teorico, {
        ...options,
        linkedCommissionId: commission.id,
        linkedSlotId: teoricoId,
      })
    );
  }
  const seminarioId = findPrimaryAssociatedSlotId(commission, 'sem');
  const seminarioSlot = seminarioId ? slotById(subject, seminarioId) : undefined;
  const seminario = seminarioSlot?.tipo === 'sem' ? seminarioSlot : undefined;
  if (seminario) {
    pushEvent(
      buildSemEvent(subject, seminario, {
        ...options,
        linkedCommissionId: commission.id,
        linkedSlotId: seminarioId,
      })
    );
  }
};

export const useSchedulerCalendar = ({
  selectedSubject,
  enrolledBySubject,
  selectedComisiones,
  filteredTeoricos,
  filteredSeminarios,
  parsedSubjects,
  showComisiones,
  showTeoricos,
  showSeminarios,
  showOtherSubjects,
  hoveredCommissionId,
  hoveredLinkedTeoricoId,
  hoveredLinkedSeminarioId,
  pinnedCommissionId,
  stackIndexBySlot,
}: UseSchedulerCalendarParams) => {
  const enrolledCurrentCommissionId = selectedSubject
    ? enrolledBySubject[selectedSubject.id]
    : undefined;

  const enrolledCurrentCommission = useMemo(
    () =>
      enrolledCurrentCommissionId
        ? selectedSubject.comisiones.find((c) => c.id === enrolledCurrentCommissionId) || null
        : null,
    [selectedSubject.comisiones, enrolledCurrentCommissionId]
  );

  const activeCommissionId = hoveredCommissionId || pinnedCommissionId;
  const activeCommission = selectedComisiones.find((c) => c.id === activeCommissionId) || null;

  const events = useMemo<CalendarEvent[]>(() => {
    const built: CalendarEvent[] = [];
    const seenEventIds = new Set<string>();
    const linkedCommissionIdsByTeoricoId = buildLinkedCommissionIdsMap(selectedComisiones, 'teo');
    const linkedCommissionIdsBySeminarioId = buildLinkedCommissionIdsMap(selectedComisiones, 'sem');

    const pushEvent = (event: CalendarEvent) => {
      if (seenEventIds.has(event.id)) return;
      seenEventIds.add(event.id);
      built.push(event);
    };

    if (showComisiones) {
      selectedComisiones.forEach((commission) => {
        pushEvent(buildPracEvent(selectedSubject, commission));
      });
    }

    if (showTeoricos) {
      filteredTeoricos.forEach((teorico) => {
        pushEvent(
          buildTeoEvent(selectedSubject, teorico, {
            linkedCommissionIds: linkedCommissionIdsByTeoricoId[teorico.id],
          })
        );
      });
    }

    if (showSeminarios) {
      filteredSeminarios.forEach((seminario) => {
        pushEvent(
          buildSemEvent(selectedSubject, seminario, {
            linkedCommissionIds: linkedCommissionIdsBySeminarioId[seminario.id],
          })
        );
      });
    }

    if (hoveredLinkedTeoricoId) {
      (linkedCommissionIdsByTeoricoId[hoveredLinkedTeoricoId] || []).forEach((commissionId) => {
        const linkedCommission = selectedComisiones.find((c) => c.id === commissionId);
        if (!linkedCommission) return;
        pushEvent(buildPracEvent(selectedSubject, linkedCommission));
      });
    }

    if (hoveredLinkedSeminarioId) {
      (linkedCommissionIdsBySeminarioId[hoveredLinkedSeminarioId] || []).forEach((commissionId) => {
        const linkedCommission = selectedComisiones.find((c) => c.id === commissionId);
        if (!linkedCommission) return;
        pushEvent(buildPracEvent(selectedSubject, linkedCommission));
      });
    }

    if (activeCommission) {
      pushCommissionBundle({
        subject: selectedSubject,
        commission: activeCommission,
        pushEvent,
      });
    }

    if (enrolledCurrentCommission) {
      pushCommissionBundle({
        subject: selectedSubject,
        commission: enrolledCurrentCommission,
        pushEvent,
      });
    }

    if (showOtherSubjects) {
      parsedSubjects
        .filter((subject) => subject.id !== selectedSubject.id)
        .forEach((subject) => {
          const commissionId = enrolledBySubject[subject.id];
          if (!commissionId) return;
          const commission = subject.comisiones.find((item) => item.id === commissionId);
          if (!commission) return;
          pushCommissionBundle({
            subject,
            commission,
            pushEvent,
            options: {
              idPrefix: `ext-${subject.id}-`,
              isExternal: true,
            },
          });
        });
    }

    return built;
  }, [
    selectedComisiones,
    filteredTeoricos,
    filteredSeminarios,
    parsedSubjects,
    selectedSubject,
    enrolledBySubject,
    showComisiones,
    showTeoricos,
    showSeminarios,
    showOtherSubjects,
    hoveredLinkedTeoricoId,
    hoveredLinkedSeminarioId,
    activeCommission,
    enrolledCurrentCommission,
  ]);

  const visibleEventSlots = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const slotKey = slotKeyForEvent(event);
      const existing = grouped.get(slotKey) || [];
      existing.push(event);
      grouped.set(slotKey, existing);
    });

    return Array.from(grouped.entries()).map(([slotKey, slotEvents]) => {
      const stackSize = slotEvents.length;
      const storedIndex = stackIndexBySlot[slotKey] ?? 0;
      const normalizedStoredIndex = ((storedIndex % stackSize) + stackSize) % stackSize;
      const activeMatchIndex = activeCommission
        ? (() => {
            const activeTeoricoId = findPrimaryAssociatedSlotId(activeCommission, 'teo');
            const activeSeminarioId = findPrimaryAssociatedSlotId(activeCommission, 'sem');
            return slotEvents.findIndex(
              (ev) =>
                ev.linkedCommissionId === activeCommission.id ||
                matchesLinkedRoleSlot(ev, 'teo', activeTeoricoId) ||
                matchesLinkedRoleSlot(ev, 'sem', activeSeminarioId)
            );
          })()
        : -1;
      const enrolledMatchIndex =
        !activeCommission && enrolledCurrentCommission
          ? slotEvents.findIndex((ev) => {
              const enrolledTeoricoId = findPrimaryAssociatedSlotId(
                enrolledCurrentCommission,
                'teo'
              );
              const enrolledSeminarioId = findPrimaryAssociatedSlotId(
                enrolledCurrentCommission,
                'sem'
              );
              return (
                ev.sourceSubjectId === selectedSubject.id &&
                (ev.linkedCommissionId === enrolledCurrentCommission.id ||
                  matchesLinkedRoleSlot(ev, 'teo', enrolledTeoricoId) ||
                  matchesLinkedRoleSlot(ev, 'sem', enrolledSeminarioId))
              );
            })
          : -1;
      const safeIndex =
        activeMatchIndex >= 0
          ? activeMatchIndex
          : enrolledMatchIndex >= 0
            ? enrolledMatchIndex
            : normalizedStoredIndex;
      return {
        slotKey,
        stackSize,
        stackIndex: safeIndex,
        event: slotEvents[safeIndex],
        slotEvents,
      };
    });
  }, [events, stackIndexBySlot, activeCommission, enrolledCurrentCommission, selectedSubject.id]);

  return {
    enrolledCurrentCommissionId,
    activeCommission,
    events,
    visibleEventSlots,
  };
};
