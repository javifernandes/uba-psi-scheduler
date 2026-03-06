import { DAYS, DAY_LABELS, hourRows } from '../../psicologia-scheduler.utils';

type CalendarGridBaseProps = {
  onEmptyCellEnter: () => void;
};

export const CalendarGridBase = ({ onEmptyCellEnter }: CalendarGridBaseProps) => (
  <>
    <div className="border-b border-r border-[#e8d8e1] bg-[#fdf8fb] dark:border-zinc-700 dark:bg-zinc-900" />
    {DAYS.map(day => (
      <div
        key={`head-${day}`}
        className="border-b border-l border-[#e8d8e1] bg-[#fdf8fb] text-center text-xs font-semibold text-[#553149] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div className="pt-3">{DAY_LABELS[day]}</div>
      </div>
    ))}

    {hourRows.map(hour => (
      <div key={`row-${hour}`} className="contents">
        <div className="border-r border-t border-[#e8d8e1] bg-[#fdf8fb] pt-0.5 text-center text-[11px] text-[#856d7b] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          {String(hour).padStart(2, '0')}:00
        </div>
        {DAYS.map(day => (
          <div
            key={`cell-${day}-${hour}`}
            className="border-l border-t border-[#e8d8e1] dark:border-zinc-700"
            onMouseEnter={onEmptyCellEnter}
          />
        ))}
      </div>
    ))}
  </>
);
