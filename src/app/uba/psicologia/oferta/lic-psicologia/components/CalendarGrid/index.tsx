'use client';

import { useEffect, useState } from 'react';
import { hourRows } from '../../psicologia-scheduler.utils';
import { CalendarEventCard } from './EventCard';
import { CalendarGridBase } from './GridBase';
import { CalendarLegend } from './Legend';
import type { CalendarGridProps } from './types';

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
  pinnedCommissionId,
  setPinnedCommissionId,
  setStackIndexBySlot,
  onToggleEnrollment,
}: CalendarGridProps) => {
  const [showCalendarOnlyTimes, setShowCalendarOnlyTimes] = useState(false);

  useEffect(() => {
    if (!selectedSubjectId) return;
    if (showCalendarOnlyTimes) setShowCalendarOnlyTimes(false);
  }, [selectedSubjectId, showCalendarOnlyTimes]);

  return (
    <>
      <CalendarLegend />
      <div
        className="relative grid min-w-[920px] grid-cols-[72px_repeat(7,minmax(0,1fr))]"
        style={{ gridTemplateRows: `42px repeat(${hourRows.length}, 48px)` }}
      >
        <CalendarGridBase
          onEmptyCellEnter={() => {
            if (hoveredCommissionId !== null) setHoveredCommissionId(null);
            if (hoveredConflictEventId !== null) setHoveredConflictEventId(null);
            if (pinnedCommissionId !== null) setPinnedCommissionId(null);
            if (showCalendarOnlyTimes) setShowCalendarOnlyTimes(false);
          }}
        />

        {visibleEventSlots.map(slot => (
          <CalendarEventCard
            key={slot.slotKey}
            slot={slot}
            activeCommission={activeCommission}
            selectedSubjectId={selectedSubjectId}
            showCalendarOnlyTimes={showCalendarOnlyTimes}
            setShowCalendarOnlyTimes={setShowCalendarOnlyTimes}
            enrolledBySubject={enrolledBySubject}
            enrolledCurrentCommissionId={enrolledCurrentCommissionId}
            conflictByEventId={conflictByEventId}
            hoveredConflictEventId={hoveredConflictEventId}
            setHoveredConflictEventId={setHoveredConflictEventId}
            setHoveredCommissionId={setHoveredCommissionId}
            setPinnedCommissionId={setPinnedCommissionId}
            setStackIndexBySlot={setStackIndexBySlot}
            onToggleEnrollment={onToggleEnrollment}
          />
        ))}
      </div>
    </>
  );
};
