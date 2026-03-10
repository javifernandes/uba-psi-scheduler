import type { CSSProperties } from 'react';
import type { Comision, ReservedSlot } from '../../scheduler.types';
import {
  DAYS,
  h2m,
  headerHeightPx,
  hourHeightPx,
  splitAula,
  splitEventTitle,
  startHour,
  timeColumnWidthPx,
} from '../../scheduler.utils';
import type { VisibleEventSlot } from './types';

type UseCalendarEventCardStateParams = {
  slot: VisibleEventSlot;
  activeCommission: Comision | null;
  selectedSubjectId: string;
  enrolledBySubject: Record<string, string>;
  enrolledCurrentCommissionId?: string;
  conflictByEventId: Record<string, ReservedSlot[]>;
  hoveredConflictEventId: string | null;
};

export const useCalendarEventCardState = ({
  slot,
  activeCommission,
  selectedSubjectId,
  enrolledBySubject,
  enrolledCurrentCommissionId,
  conflictByEventId,
  hoveredConflictEventId,
}: UseCalendarEventCardStateParams) => {
  const { event } = slot;
  const dayIndex = DAYS.indexOf(event.dia);
  const aulaParts = splitAula(event.aula);
  const titleParts = splitEventTitle(event.title);
  const from = h2m(event.inicio);
  const to = h2m(event.fin);
  const minuteHeightPx = hourHeightPx / 60;
  const topPx = headerHeightPx + (from - startHour * 60) * minuteHeightPx;
  const heightPx = (to - from) * minuteHeightPx;
  const canWrapLabel = heightPx >= 92;
  const activeTeoricoId = activeCommission?.teoricoId || null;
  const activeSeminarioId = activeCommission?.seminarioId || null;
  const canSaveFromCard =
    !event.isExternal && event.sourceSubjectId === selectedSubjectId && !!event.linkedCommissionId;
  const isSavedFromCard =
    canSaveFromCard && enrolledBySubject[selectedSubjectId] === event.linkedCommissionId;
  const isCurrentSubjectEvent = event.sourceSubjectId === selectedSubjectId;
  const isActive =
    isCurrentSubjectEvent &&
    ((event.tipo === 'prac' && event.linkedCommissionId === activeCommission?.id) ||
      (event.tipo === 'teo' && event.linkedTeoricoId === activeTeoricoId) ||
      (event.tipo === 'sem' && event.linkedSeminarioId === activeSeminarioId));
  const isEnrolledCurrent =
    event.sourceSubjectId === selectedSubjectId &&
    !!enrolledCurrentCommissionId &&
    event.linkedCommissionId === enrolledCurrentCommissionId;
  const enrolledForEventSubject = enrolledBySubject[event.sourceSubjectId];
  const isEnrolledForItsSubject =
    !!enrolledForEventSubject && event.linkedCommissionId === enrolledForEventSubject;
  const shouldDim = Boolean(activeCommission) && !isActive && !isEnrolledForItsSubject;
  const hideText = shouldDim;
  const eventConflicts = conflictByEventId[event.id] || [];
  const hasConflict = eventConflicts.length > 0;
  const showConflictBubble = hoveredConflictEventId === event.id && hasConflict;
  const layoutStyle: CSSProperties = {
    left: `calc(${timeColumnWidthPx}px + ${dayIndex} * ((100% - ${timeColumnWidthPx}px) / 7) + 4px)`,
    top: `${topPx}px`,
    width: `calc(((100% - ${timeColumnWidthPx}px) / 7) - 8px)`,
    height: `${Math.max(14, heightPx - 4)}px`,
  };
  const titleWrapStyle: CSSProperties | undefined = canWrapLabel
    ? {
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
      }
    : undefined;

  return {
    aulaParts,
    titleParts,
    canWrapLabel,
    canSaveFromCard,
    isSavedFromCard,
    isActive,
    isEnrolledCurrent,
    shouldDim,
    hideText,
    eventConflicts,
    hasConflict,
    showConflictBubble,
    layoutStyle,
    titleWrapStyle,
  };
};
