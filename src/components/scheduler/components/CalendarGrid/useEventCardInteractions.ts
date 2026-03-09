import type { KeyboardEventHandler, MouseEventHandler, Dispatch, SetStateAction } from 'react';
import type { VisibleEventSlot } from './types';

const HOVER_LEAVE_GRACE_MS = 160;
const HOVER_LOCKED_TOUR_STEP_ID = 'calendar-overview';

const isHoverLockedByTour = () =>
  typeof window !== 'undefined' &&
  window.document.body.dataset.schedulerTourStep === HOVER_LOCKED_TOUR_STEP_ID;

type UseEventCardInteractionsParams = {
  slot: VisibleEventSlot;
  hasConflict: boolean;
  hoveredConflictEventId: string | null;
  setHoveredConflictEventId: Dispatch<SetStateAction<string | null>>;
  setHoveredCommissionId: Dispatch<SetStateAction<string | null>>;
  setHoveredLinkedTeoricoId: Dispatch<SetStateAction<string | null>>;
  setHoveredLinkedSeminarioId: Dispatch<SetStateAction<string | null>>;
  setPinnedCommissionId: Dispatch<SetStateAction<string | null>>;
  setStackIndexBySlot: Dispatch<SetStateAction<Record<string, number>>>;
  onToggleEnrollment: (commissionId: string) => void;
};

export const useEventCardInteractions = ({
  slot,
  hasConflict,
  hoveredConflictEventId,
  setHoveredConflictEventId,
  setHoveredCommissionId,
  setHoveredLinkedTeoricoId,
  setHoveredLinkedSeminarioId,
  setPinnedCommissionId,
  setStackIndexBySlot,
  onToggleEnrollment,
}: UseEventCardInteractionsParams) => {
  const { event, slotKey, stackSize, stackIndex, slotEvents } = slot;

  const hoverLinkedCommissionId = event.tipo === 'prac' ? event.linkedCommissionId || null : null;
  const hoverLinkedTeoricoId = event.tipo === 'teo' ? event.linkedTeoricoId || null : null;
  const hoverLinkedSeminarioId = event.tipo === 'sem' ? event.linkedSeminarioId || null : null;

  const togglePinnedCommission = () => {
    if (event.isExternal) return;
    const commissionId = hoverLinkedCommissionId;
    if (!commissionId) return;
    setPinnedCommissionId(prev => (prev === commissionId ? null : commissionId));
  };

  const onCardMouseEnter: MouseEventHandler<HTMLDivElement> = () => {
    if (isHoverLockedByTour()) return;
    if (event.isExternal) return;
    if (hasConflict) setHoveredConflictEventId(event.id);
    setHoveredCommissionId(hoverLinkedCommissionId);
    setHoveredLinkedTeoricoId(hoverLinkedTeoricoId);
    setHoveredLinkedSeminarioId(hoverLinkedSeminarioId);
  };

  const onCardMouseLeave: MouseEventHandler<HTMLDivElement> = () => {
    if (isHoverLockedByTour()) return;
    const commissionId = hoverLinkedCommissionId;
    const teoricoId = hoverLinkedTeoricoId;
    const seminarioId = hoverLinkedSeminarioId;
    window.setTimeout(() => {
      if (commissionId) {
        setHoveredCommissionId(prev => (prev === commissionId ? null : prev));
      }
      if (teoricoId) {
        setHoveredLinkedTeoricoId(prev => (prev === teoricoId ? null : prev));
      }
      if (seminarioId) {
        setHoveredLinkedSeminarioId(prev => (prev === seminarioId ? null : prev));
      }
      setHoveredConflictEventId(prev => (prev === event.id ? null : prev));
    }, HOVER_LEAVE_GRACE_MS);
  };

  const onCardClick: MouseEventHandler<HTMLDivElement> = () => {
    togglePinnedCommission();
  };

  const onCardKeyDown: KeyboardEventHandler<HTMLDivElement> = eventKey => {
    if (eventKey.key !== 'Enter' && eventKey.key !== ' ') return;
    eventKey.preventDefault();
    togglePinnedCommission();
  };

  const onSaveButtonClick: MouseEventHandler<HTMLButtonElement> = clickEvent => {
    clickEvent.stopPropagation();
    const commissionId = hoverLinkedCommissionId;
    if (!commissionId) return;
    onToggleEnrollment(commissionId);
  };

  const onStackPrevClick: MouseEventHandler<HTMLButtonElement> = clickEvent => {
    clickEvent.stopPropagation();
    const nextIndex = ((stackIndex ?? 0) - 1 + stackSize) % stackSize;
    const nextEvent = slotEvents[nextIndex];
    setStackIndexBySlot(prev => ({
      ...prev,
      [slotKey]: nextIndex,
    }));
    setHoveredCommissionId(nextEvent?.tipo === 'prac' ? nextEvent.linkedCommissionId ?? null : null);
    setHoveredLinkedTeoricoId(nextEvent?.tipo === 'teo' ? nextEvent.linkedTeoricoId ?? null : null);
    setHoveredLinkedSeminarioId(
      nextEvent?.tipo === 'sem' ? nextEvent.linkedSeminarioId ?? null : null
    );
  };

  const onStackNextClick: MouseEventHandler<HTMLButtonElement> = clickEvent => {
    clickEvent.stopPropagation();
    const nextIndex = ((stackIndex ?? 0) + 1) % stackSize;
    const nextEvent = slotEvents[nextIndex];
    setStackIndexBySlot(prev => ({
      ...prev,
      [slotKey]: nextIndex,
    }));
    setHoveredCommissionId(nextEvent?.tipo === 'prac' ? nextEvent.linkedCommissionId ?? null : null);
    setHoveredLinkedTeoricoId(nextEvent?.tipo === 'teo' ? nextEvent.linkedTeoricoId ?? null : null);
    setHoveredLinkedSeminarioId(
      nextEvent?.tipo === 'sem' ? nextEvent.linkedSeminarioId ?? null : null
    );
  };

  return {
    onCardMouseEnter,
    onCardMouseLeave,
    onCardClick,
    onCardKeyDown,
    onSaveButtonClick,
    onStackPrevClick,
    onStackNextClick,
  };
};
