import type { KeyboardEventHandler, MouseEventHandler, Dispatch, SetStateAction } from 'react';
import type { VisibleEventSlot } from './types';

const HOVER_LEAVE_GRACE_MS = 160;

type UseEventCardInteractionsParams = {
  slot: VisibleEventSlot;
  hasConflict: boolean;
  hoveredConflictEventId: string | null;
  setHoveredConflictEventId: Dispatch<SetStateAction<string | null>>;
  setHoveredCommissionId: Dispatch<SetStateAction<string | null>>;
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
  setPinnedCommissionId,
  setStackIndexBySlot,
  onToggleEnrollment,
}: UseEventCardInteractionsParams) => {
  const { event, slotKey, stackSize, stackIndex, slotEvents } = slot;

  const togglePinnedCommission = () => {
    if (event.isExternal) return;
    const commissionId = event.linkedCommissionId;
    if (!commissionId) return;
    setPinnedCommissionId(prev => (prev === commissionId ? null : commissionId));
  };

  const onCardMouseEnter: MouseEventHandler<HTMLDivElement> = () => {
    if (event.isExternal) return;
    if (hasConflict) setHoveredConflictEventId(event.id);
    if (event.linkedCommissionId) setHoveredCommissionId(event.linkedCommissionId);
  };

  const onCardMouseLeave: MouseEventHandler<HTMLDivElement> = () => {
    const commissionId = event.linkedCommissionId || null;
    window.setTimeout(() => {
      if (commissionId) {
        setHoveredCommissionId(prev => (prev === commissionId ? null : prev));
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
    const commissionId = event.linkedCommissionId;
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
    setHoveredCommissionId(nextEvent?.linkedCommissionId ?? null);
  };

  const onStackNextClick: MouseEventHandler<HTMLButtonElement> = clickEvent => {
    clickEvent.stopPropagation();
    const nextIndex = ((stackIndex ?? 0) + 1) % stackSize;
    const nextEvent = slotEvents[nextIndex];
    setStackIndexBySlot(prev => ({
      ...prev,
      [slotKey]: nextIndex,
    }));
    setHoveredCommissionId(nextEvent?.linkedCommissionId ?? null);
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
