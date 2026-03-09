'use client';

import { useEffect, useRef, useState } from 'react';
import { hourRows } from '../../scheduler.utils';
import { CalendarEventCard } from './EventCard';
import { CalendarGridBase } from './GridBase';
import { CalendarLegend } from './Legend';
import type { CalendarGridProps } from './types';

const EMPTY_CELL_CLEAR_GRACE_MS = 160;

export const CalendarGrid = ({
  visibleEventSlots,
  activeCommission,
  selectedSubjectId,
  enrolledBySubject,
  enrolledCurrentCommissionId,
  conflictByEventId,
  hoveredConflictEventId,
  setHoveredConflictEventId,
  hoveredCommissionId,
  setHoveredCommissionId,
  hoveredLinkedTeoricoId,
  setHoveredLinkedTeoricoId,
  hoveredLinkedSeminarioId,
  setHoveredLinkedSeminarioId,
  pinnedCommissionId,
  setPinnedCommissionId,
  setStackIndexBySlot,
  onToggleEnrollment,
}: CalendarGridProps) => {
  const [showCalendarOnlyTimes, setShowCalendarOnlyTimes] = useState(false);
  const externalHoverCountRef = useRef(0);

  useEffect(() => {
    if (!selectedSubjectId) return;
    if (showCalendarOnlyTimes) setShowCalendarOnlyTimes(false);
    externalHoverCountRef.current = 0;
  }, [selectedSubjectId, showCalendarOnlyTimes]);

  const onCalendarOnlyExternalEnter = () => {
    externalHoverCountRef.current += 1;
    if (!showCalendarOnlyTimes) setShowCalendarOnlyTimes(true);
  };

  const onCalendarOnlyExternalLeave = () => {
    window.setTimeout(() => {
      externalHoverCountRef.current = Math.max(0, externalHoverCountRef.current - 1);
      if (externalHoverCountRef.current === 0) setShowCalendarOnlyTimes(false);
    }, EMPTY_CELL_CLEAR_GRACE_MS);
  };

  return (
    <>
      <div
        className="relative grid min-w-[920px] grid-cols-[72px_repeat(7,minmax(0,1fr))]"
        style={{ gridTemplateRows: `42px repeat(${hourRows.length}, 48px)` }}
        data-tour="calendar-grid-layout"
        data-testid="calendar-grid-layout"
      >
        <CalendarGridBase
          onEmptyCellEnter={() => {
            const previousHoveredCommissionId = hoveredCommissionId;
            const previousHoveredLinkedTeoricoId = hoveredLinkedTeoricoId;
            const previousHoveredLinkedSeminarioId = hoveredLinkedSeminarioId;
            const previousHoveredConflictEventId = hoveredConflictEventId;
            window.setTimeout(() => {
              if (previousHoveredCommissionId !== null) {
                setHoveredCommissionId(prev =>
                  prev === previousHoveredCommissionId ? null : prev
                );
              }
              if (previousHoveredLinkedTeoricoId !== null) {
                setHoveredLinkedTeoricoId(prev =>
                  prev === previousHoveredLinkedTeoricoId ? null : prev
                );
              }
              if (previousHoveredLinkedSeminarioId !== null) {
                setHoveredLinkedSeminarioId(prev =>
                  prev === previousHoveredLinkedSeminarioId ? null : prev
                );
              }
              if (previousHoveredConflictEventId !== null) {
                setHoveredConflictEventId(prev =>
                  prev === previousHoveredConflictEventId ? null : prev
                );
              }
              if (pinnedCommissionId !== null) setPinnedCommissionId(null);
              setShowCalendarOnlyTimes(prev =>
                externalHoverCountRef.current === 0 ? false : prev
              );
            }, EMPTY_CELL_CLEAR_GRACE_MS);
          }}
        />

        {visibleEventSlots.map(slot => (
          <CalendarEventCard
            key={slot.slotKey}
            slot={slot}
            activeCommission={activeCommission}
            selectedSubjectId={selectedSubjectId}
            showCalendarOnlyTimes={showCalendarOnlyTimes}
            onCalendarOnlyExternalEnter={onCalendarOnlyExternalEnter}
            onCalendarOnlyExternalLeave={onCalendarOnlyExternalLeave}
            enrolledBySubject={enrolledBySubject}
            enrolledCurrentCommissionId={enrolledCurrentCommissionId}
            conflictByEventId={conflictByEventId}
            hoveredConflictEventId={hoveredConflictEventId}
            setHoveredConflictEventId={setHoveredConflictEventId}
            setHoveredCommissionId={setHoveredCommissionId}
            setHoveredLinkedTeoricoId={setHoveredLinkedTeoricoId}
            setHoveredLinkedSeminarioId={setHoveredLinkedSeminarioId}
            setPinnedCommissionId={setPinnedCommissionId}
            setStackIndexBySlot={setStackIndexBySlot}
            onToggleEnrollment={onToggleEnrollment}
          />
        ))}
      </div>
      <CalendarLegend />
    </>
  );
};
