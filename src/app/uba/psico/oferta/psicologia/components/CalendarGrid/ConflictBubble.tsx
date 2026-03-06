import { AlertTriangle } from 'lucide-react';
import type { ReservedSlot } from '../../psicologia-scheduler.types';
import { dayShort } from '../../psicologia-scheduler.utils';

type ConflictBubbleProps = {
  show: boolean;
  eventId: string;
  eventConflicts: ReservedSlot[];
};

export const ConflictBubble = ({ show, eventId, eventConflicts }: ConflictBubbleProps) => {
  if (!show) return null;

  return (
    <div className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 w-64 -translate-y-1/2 rounded-md border border-amber-300/80 bg-amber-100/85 px-2.5 py-2 text-[12px] font-medium text-amber-950 shadow-md backdrop-blur-sm dark:border-amber-400/50 dark:bg-amber-500/25 dark:text-amber-100">
      <div className="mb-1 inline-flex items-center gap-1 font-bold">
        <AlertTriangle size={13} />
        <span>Conflicto de horario</span>
      </div>
      {eventConflicts.slice(0, 2).map(conflict => (
        <div key={`${eventId}-${conflict.subjectId}-${conflict.title}`} className="leading-tight">
          <div className="truncate">{conflict.subjectLabel}</div>
          <div className="truncate opacity-90">
            {conflict.title} · {dayShort(conflict.day)} {conflict.start} {conflict.end}
          </div>
        </div>
      ))}
      {eventConflicts.length > 2 ? (
        <div className="mt-0.5 font-semibold">+{eventConflicts.length - 2} más</div>
      ) : null}
    </div>
  );
};
