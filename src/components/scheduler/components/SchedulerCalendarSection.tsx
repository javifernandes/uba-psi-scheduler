import type { ComponentProps } from 'react';
import { CalendarGrid } from './CalendarGrid';
import { WarningBanner } from './WarningBanner';

type SchedulerCalendarSectionProps = {
  showConflictWarning: boolean;
  conflictCatedraLabel: string;
  onDismissConflictWarning: () => void;
  calendarGridProps: ComponentProps<typeof CalendarGrid>;
};

export const SchedulerCalendarSection = ({
  showConflictWarning,
  conflictCatedraLabel,
  onDismissConflictWarning,
  calendarGridProps,
}: SchedulerCalendarSectionProps) => (
  <div className="min-h-0 xl:pr-1">
    <div
      className="relative h-full overflow-auto rounded-xl border border-[#e8d8e1] bg-white/90 dark:border-zinc-700 dark:bg-zinc-900/80"
      data-tour="calendar-grid"
    >
      {showConflictWarning ? (
        <WarningBanner
          catedraLabel={conflictCatedraLabel}
          onDismiss={onDismissConflictWarning}
        />
      ) : null}
      <CalendarGrid {...calendarGridProps} />
    </div>
  </div>
);
