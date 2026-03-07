import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { cn } from '@/lib/utils';
import type { Comision, ReservedSlot } from '../../psicologia-scheduler.types';
import { displaySubjectLabel } from '../../psicologia-scheduler.utils';
import { eventTypeClass, externalEventAccentClass, externalEventCardClass } from './styles';
import type { VisibleEventSlot } from './types';
import { CardRoom } from './CardRoom';
import { CardTime } from './CardTime';
import { CardTitle } from './CardTitle';
import { ConflictBubble } from './ConflictBubble';
import { StackSwitcher } from './StackSwitcher';
import { useCalendarEventCardState } from './useCalendarEventCardState';
import { useEventCardInteractions } from './useEventCardInteractions';
import { useRef } from 'react';

type CalendarEventCardProps = {
  slot: VisibleEventSlot;
  activeCommission: Comision | null;
  selectedSubjectId: string;
  showCalendarOnlyTimes: boolean;
  onCalendarOnlyExternalEnter: () => void;
  onCalendarOnlyExternalLeave: () => void;
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

const externalSubjectParts = (subjectLabel: string) => {
  const normalized = displaySubjectLabel(subjectLabel);
  const matched = normalized.match(/^(.*?)(?:\s+-\s+(Cátedra.*))$/i);
  if (!matched) {
    return {
      subject: normalized.replace(/^\d+\s*·\s*/, '').trim(),
      catedra: '',
    };
  }
  return {
    subject: matched[1]?.replace(/^\d+\s*·\s*/, '').trim() || normalized,
    catedra: matched[2]?.trim() || '',
  };
};

export const CalendarEventCard = ({
  slot,
  activeCommission,
  selectedSubjectId,
  showCalendarOnlyTimes,
  onCalendarOnlyExternalEnter,
  onCalendarOnlyExternalLeave,
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
  const cardRef = useRef<HTMLDivElement>(null);
  const [tourStepId, setTourStepId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const readTourStep = () => window.document.body.dataset.schedulerTourStep || null;
    setTourStepId(readTourStep());
    const onStepChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ stepId?: string | null }>;
      setTourStepId(customEvent.detail?.stepId || null);
    };
    window.addEventListener('scheduler-tour-step-change', onStepChange as EventListener);
    return () =>
      window.removeEventListener('scheduler-tour-step-change', onStepChange as EventListener);
  }, []);

  const hoverEffectsLocked = tourStepId === 'calendar-overview';
  const hideSaveButtonForTourStep = tourStepId === 'hover-commission';
  const forceShowSaveButtonForTourStep = tourStepId === 'save-commission';

  const { slotKey, event, stackSize } = slot;
  const isCalendarOnlyMode = !selectedSubjectId;
  const showExternalTimes = event.isExternal && isCalendarOnlyMode && showCalendarOnlyTimes;
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
  const externalParts = event.isExternal ? externalSubjectParts(event.sourceSubjectLabel) : null;

  return (
    <div
      ref={cardRef}
      key={slotKey}
      role="button"
      tabIndex={0}
      onMouseEnter={eventMouse => {
        onCardMouseEnter(eventMouse);
        if (event.isExternal && isCalendarOnlyMode) onCalendarOnlyExternalEnter();
      }}
      onMouseLeave={eventMouse => {
        onCardMouseLeave(eventMouse);
        if (event.isExternal && isCalendarOnlyMode) onCalendarOnlyExternalLeave();
      }}
      onClick={onCardClick}
      onKeyDown={onCardKeyDown}
      className={cn(
        'absolute rounded-md text-left text-[10.5px] font-medium text-white shadow-sm transition-[opacity,filter,color,transform] duration-200 ease-in-out',
        !hoverEffectsLocked && 'group',
        event.isExternal ? externalEventCardClass : eventTypeClass(event.tipo),
        event.isExternal && 'text-[#5a1740]',
        hasConflict && 'ring-2 ring-amber-300/85 shadow-[0_0_0_1px_rgba(180,83,9,0.35)]',
        shouldDim &&
          'opacity-20 grayscale blur-[0.3px] dark:opacity-45 dark:grayscale-0 dark:brightness-75',
        isEnrolledCurrent && 'ring-2 ring-[#fff1b5] shadow-[0_0_0_1px_rgba(255,241,181,0.5)]',
        isActive && 'ring-2 ring-[#fbe7f3] dark:ring-zinc-200/70'
      )}
      style={layoutStyle}
      data-tour-card={!event.isExternal && event.tipo === 'prac' ? 'internal-commission' : 'event-card'}
      data-tour-card-kind={
        event.isExternal ? 'external' : event.tipo === 'prac' ? 'internal-commission' : 'internal-linked'
      }
      data-tour-internal={!event.isExternal ? 'true' : 'false'}
      data-testid="calendar-event-card"
      data-event-id={event.id}
      data-event-type={event.tipo}
      data-subject-id={event.sourceSubjectId}
      data-commission-id={event.linkedCommissionId || ''}
      data-is-external={event.isExternal ? 'true' : 'false'}
      data-stack-size={String(stackSize)}
    >
      {hasConflict ? (
        <span className="pointer-events-none absolute left-1/2 top-0.5 z-20 -translate-x-1/2 rounded bg-amber-300/90 px-1 text-[8px] font-black uppercase tracking-wide text-amber-950 shadow-sm">
          !
        </span>
      ) : null}
      <ConflictBubble
        show={showConflictBubble}
        eventId={event.id}
        eventType={event.tipo}
        eventConflicts={eventConflicts}
        anchorRef={cardRef}
      />
      {canSaveFromCard && !event.isExternal && !hideSaveButtonForTourStep ? (
        <button
          type="button"
          onClick={onSaveButtonClick}
          className={cn(
            'absolute bottom-1 left-1/2 z-10 -translate-x-1/2 rounded px-1.5 py-0.5 text-[10px] leading-none transition-opacity duration-150',
            isSavedFromCard
              ? 'bg-[#fff1b5]/90 text-[#5a1740] opacity-100'
              : forceShowSaveButtonForTourStep
                ? 'bg-black/25 text-white/90 opacity-100'
                : 'bg-black/25 text-white/90 opacity-0 group-hover:opacity-100'
          )}
          aria-label="Guardar o quitar esta comisión elegida"
          data-tour="event-save-toggle"
          data-testid="event-save-toggle"
          data-commission-id={event.linkedCommissionId || ''}
        >
          {isSavedFromCard ? '★' : '☆'}
        </button>
      ) : null}
      <StackSwitcher
        stackSize={stackSize}
        onPrevClick={onStackPrevClick}
        onNextClick={onStackNextClick}
        hoverEffectsLocked={hoverEffectsLocked}
        isExternal={Boolean(event.isExternal)}
      />
      {event.isExternal && externalParts ? (
        <>
          <span
            className={cn(
              'absolute inset-y-0 left-0 w-2 rounded-l-md',
              externalEventAccentClass(event.tipo)
            )}
          />
          <span
            className={cn(
              'absolute left-4 right-10 flex min-w-0 flex-col items-start justify-center',
              showExternalTimes ? 'top-5 bottom-5' : 'inset-y-1',
              hideText && 'opacity-0'
            )}
          >
            <span className="block w-full truncate text-[11px] font-bold leading-tight text-[#5a1740]">
              {externalParts.subject}
            </span>
            {externalParts.catedra ? (
              <span
                className="block w-full truncate text-[10px] font-medium leading-tight text-[#9a6f89]"
              >
                {externalParts.catedra}
              </span>
            ) : null}
          </span>
          {showExternalTimes ? (
            <>
              <span
                className={cn(
                  'absolute left-4 top-1 text-[10px] font-semibold leading-none tabular-nums text-[#9a6f89]',
                  hideText && 'opacity-0'
                )}
              >
                {event.inicio}
              </span>
              <span
                className={cn(
                  'absolute bottom-1 left-4 text-[10px] font-semibold leading-none tabular-nums text-[#9a6f89]',
                  hideText && 'opacity-0'
                )}
              >
                {event.fin}
              </span>
            </>
          ) : null}
          <span
            className={cn(
              'absolute bottom-0.5 right-2 text-[10px] font-black tracking-wide text-[#9a6f89]',
              hideText && 'opacity-0'
            )}
          >
            {aulaParts.prefix}
          </span>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
};
