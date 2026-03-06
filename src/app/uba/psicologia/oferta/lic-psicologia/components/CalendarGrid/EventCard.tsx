import type { Dispatch, SetStateAction } from 'react';
import { cn } from '@/lib/utils';
import type { Comision, ReservedSlot } from '../../psicologia-scheduler.types';
import { eventTypeClass } from './styles';
import type { VisibleEventSlot } from './types';
import { CardRoom } from './CardRoom';
import { CardTime } from './CardTime';
import { CardTitle } from './CardTitle';
import { ConflictBubble } from './ConflictBubble';
import { StackSwitcher } from './StackSwitcher';
import { useCalendarEventCardState } from './useCalendarEventCardState';
import { useEventCardInteractions } from './useEventCardInteractions';

type CalendarEventCardProps = {
  slot: VisibleEventSlot;
  activeCommission: Comision | null;
  selectedSubjectId: string;
  enrolledBySubject: Record<string, string>;
  enrolledCurrentCommissionId?: string;
  conflictByEventId: Record<string, ReservedSlot[]>;
  hoveredConflictEventId: string | null;
  setHoveredConflictEventId: Dispatch<SetStateAction<string | null>>;
  setHoveredCommissionId: Dispatch<SetStateAction<string | null>>;
  setPinnedCommissionId: Dispatch<SetStateAction<string | null>>;
  setStackIndexBySlot: Dispatch<SetStateAction<Record<string, number>>>;
  onToggleEnrollment: (commissionId: string) => void;
};

export const CalendarEventCard = ({
  slot,
  activeCommission,
  selectedSubjectId,
  enrolledBySubject,
  enrolledCurrentCommissionId,
  conflictByEventId,
  hoveredConflictEventId,
  setHoveredConflictEventId,
  setHoveredCommissionId,
  setPinnedCommissionId,
  setStackIndexBySlot,
  onToggleEnrollment,
}: CalendarEventCardProps) => {
  const { slotKey, event, stackSize } = slot;
  const {
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
  } = useCalendarEventCardState({
    slot,
    activeCommission,
    selectedSubjectId,
    enrolledBySubject,
    enrolledCurrentCommissionId,
    conflictByEventId,
    hoveredConflictEventId,
  });
  const {
    onCardMouseEnter,
    onCardMouseLeave,
    onCardClick,
    onCardKeyDown,
    onSaveButtonClick,
    onStackPrevClick,
    onStackNextClick,
  } = useEventCardInteractions({
    slot,
    hasConflict,
    hoveredConflictEventId,
    setHoveredConflictEventId,
    setHoveredCommissionId,
    setPinnedCommissionId,
    setStackIndexBySlot,
    onToggleEnrollment,
  });

  return (
    <div
      key={slotKey}
      role="button"
      tabIndex={0}
      onMouseEnter={onCardMouseEnter}
      onMouseLeave={onCardMouseLeave}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
      className={cn(
        'group absolute rounded-md text-left text-[10.5px] font-medium text-white shadow-sm transition-[opacity,filter,color,transform] duration-200 ease-in-out',
        eventTypeClass(event.tipo),
        event.isExternal && 'saturate-50 brightness-90 opacity-75 ring-1 ring-white/20',
        hasConflict && 'ring-2 ring-amber-300/85 shadow-[0_0_0_1px_rgba(180,83,9,0.35)]',
        shouldDim &&
          'opacity-20 grayscale blur-[0.3px] dark:opacity-45 dark:grayscale-0 dark:brightness-75',
        isEnrolledCurrent && 'ring-2 ring-[#fff1b5] shadow-[0_0_0_1px_rgba(255,241,181,0.5)]',
        isActive && 'ring-2 ring-[#fbe7f3] dark:ring-zinc-200/70'
      )}
      style={layoutStyle}
    >
      {hasConflict ? (
        <span className="pointer-events-none absolute left-1 top-0.5 z-20 rounded bg-amber-300/90 px-1 text-[8px] font-black uppercase tracking-wide text-amber-950 shadow-sm">
          !
        </span>
      ) : null}
      <ConflictBubble
        show={showConflictBubble}
        eventId={event.id}
        eventConflicts={eventConflicts}
      />
      {canSaveFromCard ? (
        <button
          type="button"
          onClick={onSaveButtonClick}
          className={cn(
            'absolute bottom-1 left-1/2 z-10 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] leading-none transition-opacity duration-150',
            isSavedFromCard
              ? 'bg-[#fff1b5]/90 text-[#5a1740] opacity-100'
              : 'bg-black/25 text-white/90 opacity-0 group-hover:opacity-100'
          )}
          aria-label="Guardar o quitar esta comisión elegida"
        >
          {isSavedFromCard ? '★' : '☆'}
        </button>
      ) : null}
      <StackSwitcher
        stackSize={stackSize}
        onPrevClick={onStackPrevClick}
        onNextClick={onStackNextClick}
      />
      <CardTime
        value={event.inicio}
        type={event.tipo}
        position="top"
        hidden={!isActive || hideText}
      />
      <CardTitle
        code={titleParts.code}
        label={titleParts.label}
        type={event.tipo}
        canWrap={canWrapLabel}
        wrapStyle={titleWrapStyle}
        hidden={hideText}
      />
      <CardTime
        value={event.fin}
        type={event.tipo}
        position="bottom"
        hidden={!isActive || hideText}
      />
      <CardRoom
        prefix={aulaParts.prefix}
        room={aulaParts.room}
        type={event.tipo}
        hidden={hideText}
      />
    </div>
  );
};
