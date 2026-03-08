import { useMemo } from 'react';
import type { CalendarEvent, ParsedSubject } from '../psicologia-scheduler.types';
import {
  buildLinkedCommissionIdsMap,
  shortTeacherName,
  slotKeyForEvent,
} from '../psicologia-scheduler.utils';

type UseSchedulerCalendarParams = {
  selectedSubject: ParsedSubject;
  enrolledBySubject: Record<string, string>;
  selectedComisiones: ParsedSubject['comisiones'];
  filteredTeoricos: ParsedSubject['teoricos'];
  filteredSeminarios: ParsedSubject['seminarios'];
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

type EventSubject = Pick<ParsedSubject, 'id' | 'label' | 'teoricoMap' | 'seminarioMap'>;

type EventOptions = {
  idPrefix?: string;
  isExternal?: boolean;
  linkedCommissionId?: string;
  linkedCommissionIds?: string[];
};

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
  teorico: ParsedSubject['teoricos'][number],
  options: EventOptions & { linkedTeoricoId?: string } = {}
): CalendarEvent => ({
  tipo: 'teo',
  id: `${options.idPrefix || ''}teo-${teorico.id}`,
  dia: teorico.dia,
  inicio: teorico.inicio,
  fin: teorico.fin,
  aula: teorico.aula,
  title: buildTitle(teorico.id, teorico.profesor),
  linkedTeoricoId: options.linkedTeoricoId || teorico.id,
  linkedCommissionId: options.linkedCommissionId,
  linkedCommissionIds: options.linkedCommissionIds,
  sourceSubjectId: subject.id,
  sourceSubjectLabel: subject.label,
  isExternal: options.isExternal,
});

const buildSemEvent = (
  subject: Pick<ParsedSubject, 'id' | 'label'>,
  seminario: ParsedSubject['seminarios'][number],
  options: EventOptions & { linkedSeminarioId?: string } = {}
): CalendarEvent => ({
  tipo: 'sem',
  id: `${options.idPrefix || ''}sem-${seminario.id}`,
  dia: seminario.dia,
  inicio: seminario.inicio,
  fin: seminario.fin,
  aula: seminario.aula,
  title: buildTitle(seminario.id, seminario.profesor),
  linkedSeminarioId: options.linkedSeminarioId || seminario.id,
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
  const teorico = commission.teoricoId ? subject.teoricoMap[commission.teoricoId] : undefined;
  if (teorico) {
    pushEvent(
      buildTeoEvent(subject, teorico, {
        ...options,
        linkedCommissionId: commission.id,
        linkedTeoricoId: commission.teoricoId,
      })
    );
  }
  const seminario = commission.seminarioId
    ? subject.seminarioMap[commission.seminarioId]
    : undefined;
  if (seminario) {
    pushEvent(
      buildSemEvent(subject, seminario, {
        ...options,
        linkedCommissionId: commission.id,
        linkedSeminarioId: commission.seminarioId,
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
        ? selectedSubject.comisiones.find(c => c.id === enrolledCurrentCommissionId) || null
        : null,
    [selectedSubject.comisiones, enrolledCurrentCommissionId]
  );

  const activeCommissionId = hoveredCommissionId || pinnedCommissionId;
  const activeCommission = selectedComisiones.find(c => c.id === activeCommissionId) || null;

  const events = useMemo<CalendarEvent[]>(() => {
    const built: CalendarEvent[] = [];
    const seenEventIds = new Set<string>();
    const linkedCommissionIdsByTeoricoId = buildLinkedCommissionIdsMap(
      selectedComisiones,
      'teoricoId'
    );
    const linkedCommissionIdsBySeminarioId = buildLinkedCommissionIdsMap(
      selectedComisiones,
      'seminarioId'
    );

    const pushEvent = (event: CalendarEvent) => {
      if (seenEventIds.has(event.id)) return;
      seenEventIds.add(event.id);
      built.push(event);
    };

    if (showComisiones) {
      selectedComisiones.forEach(commission => {
        pushEvent(buildPracEvent(selectedSubject, commission));
      });
    }

    if (showTeoricos) {
      filteredTeoricos.forEach(teorico => {
        pushEvent(
          buildTeoEvent(selectedSubject, teorico, {
            linkedCommissionIds: linkedCommissionIdsByTeoricoId[teorico.id],
          })
        );
      });
    }

    if (showSeminarios) {
      filteredSeminarios.forEach(seminario => {
        pushEvent(
          buildSemEvent(selectedSubject, seminario, {
            linkedCommissionIds: linkedCommissionIdsBySeminarioId[seminario.id],
          })
        );
      });
    }

    if (hoveredLinkedTeoricoId) {
      (linkedCommissionIdsByTeoricoId[hoveredLinkedTeoricoId] || []).forEach(commissionId => {
        const linkedCommission = selectedComisiones.find(c => c.id === commissionId);
        if (!linkedCommission) return;
        pushEvent(buildPracEvent(selectedSubject, linkedCommission));
      });
    }

    if (hoveredLinkedSeminarioId) {
      (linkedCommissionIdsBySeminarioId[hoveredLinkedSeminarioId] || []).forEach(commissionId => {
        const linkedCommission = selectedComisiones.find(c => c.id === commissionId);
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
        .filter(subject => subject.id !== selectedSubject.id)
        .forEach(subject => {
          const commissionId = enrolledBySubject[subject.id];
          if (!commissionId) return;
          const commission = subject.comisiones.find(item => item.id === commissionId);
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
    events.forEach(event => {
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
        ? slotEvents.findIndex(
            ev =>
              ev.linkedCommissionId === activeCommission.id ||
              (ev.linkedTeoricoId &&
                activeCommission.teoricoId &&
                ev.linkedTeoricoId === activeCommission.teoricoId) ||
              (ev.linkedSeminarioId &&
                activeCommission.seminarioId &&
                ev.linkedSeminarioId === activeCommission.seminarioId)
          )
        : -1;
      const enrolledMatchIndex =
        !activeCommission && enrolledCurrentCommission
          ? slotEvents.findIndex(
              ev =>
                ev.sourceSubjectId === selectedSubject.id &&
                (ev.linkedCommissionId === enrolledCurrentCommission.id ||
                  (ev.linkedTeoricoId &&
                    enrolledCurrentCommission.teoricoId &&
                    ev.linkedTeoricoId === enrolledCurrentCommission.teoricoId) ||
                  (ev.linkedSeminarioId &&
                    enrolledCurrentCommission.seminarioId &&
                    ev.linkedSeminarioId === enrolledCurrentCommission.seminarioId))
            )
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
