import type { Dispatch, SetStateAction } from 'react';
import type { CalendarEvent, Comision, ReservedSlot } from '../../psicologia-scheduler.types';

export type VisibleEventSlot = {
  slotKey: string;
  event: CalendarEvent;
  stackSize: number;
  stackIndex: number;
  slotEvents: CalendarEvent[];
};

export type CalendarGridProps = {
  visibleEventSlots: VisibleEventSlot[];
  activeCommission: Comision | null;
  selectedSubjectId: string;
  enrolledBySubject: Record<string, string>;
  enrolledCurrentCommissionId?: string;
  conflictByEventId: Record<string, ReservedSlot[]>;
  hoveredConflictEventId: string | null;
  setHoveredConflictEventId: Dispatch<SetStateAction<string | null>>;
  hoveredCommissionId: string | null;
  setHoveredCommissionId: Dispatch<SetStateAction<string | null>>;
  pinnedCommissionId: string | null;
  setPinnedCommissionId: Dispatch<SetStateAction<string | null>>;
  setStackIndexBySlot: Dispatch<SetStateAction<Record<string, number>>>;
  onToggleEnrollment: (commissionId: string) => void;
};

export type CalendarEventCardHoverControls = {
  showCalendarOnlyTimes: boolean;
  onCalendarOnlyExternalEnter: () => void;
  onCalendarOnlyExternalLeave: () => void;
};
