import { useLayoutEffect, useMemo, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import type { ReservedSlot } from '../../scheduler.types';
import { catedraFragmentFromLabel, dayShort, h2m } from '../../scheduler.utils';

type ConflictBubbleProps = {
  show: boolean;
  eventId: string;
  eventType: 'prac' | 'teo' | 'sem';
  eventConflicts: ReservedSlot[];
  anchorRef?: RefObject<HTMLDivElement>;
};

const bubbleLabelByType: Record<'prac' | 'teo' | 'sem', string> = {
  prac: 'comisión',
  teo: 'teórico',
  sem: 'seminario',
};

const conflictSubjectLine = (subjectLabel: string) => {
  const normalized = subjectLabel.replace(/^\((\d+)\)\s*/, '$1 · ');
  const withoutCatedra = normalized.replace(/\s*-\s*Cátedra.*$/i, '').trim();
  return `${withoutCatedra} · ${catedraFragmentFromLabel(subjectLabel)}`;
};

export const ConflictBubble = ({
  show,
  eventId,
  eventType,
  eventConflicts,
  anchorRef,
}: ConflictBubbleProps) => {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const sortedConflicts = useMemo(
    () =>
      [...eventConflicts].sort((a, b) => {
        const startDiff = h2m(a.start) - h2m(b.start);
        if (startDiff !== 0) return startDiff;
        const endDiff = h2m(a.end) - h2m(b.end);
        if (endDiff !== 0) return endDiff;
        return a.subjectLabel.localeCompare(b.subjectLabel, 'es');
      }),
    [eventConflicts]
  );
  const conflicts = useMemo(() => sortedConflicts.slice(0, 3), [sortedConflicts]);

  useLayoutEffect(() => {
    if (!show) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef?.current;
      if (!anchor) {
        setPosition({ left: 16, top: 16 });
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const bubbleWidth = 320;
      const bubbleHeight = Math.max(180, 112 + Math.min(3, eventConflicts.length) * 54);
      const gap = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const fitsRight = rect.right + gap + bubbleWidth <= viewportWidth - 8;
      const fitsLeft = rect.left - gap - bubbleWidth >= 8;
      const left = fitsRight
        ? rect.right + gap
        : fitsLeft
          ? rect.left - bubbleWidth - gap
          : Math.max(8, Math.min(viewportWidth - bubbleWidth - 8, rect.right + gap));
      const top = Math.max(
        8,
        Math.min(viewportHeight - bubbleHeight - 8, rect.top + rect.height / 2 - bubbleHeight / 2)
      );

      setPosition({ left, top });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, eventConflicts.length, show]);

  if (!show) return null;
  if (typeof document === 'undefined' || !position) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[1200] w-96 rounded-lg border border-amber-300 bg-[#fff1bf] px-4 py-3 text-[13px] font-medium text-amber-950 shadow-md dark:border-amber-400/55 dark:bg-[#4a3410]/95 dark:text-amber-100"
      style={{ left: `${position.left}px`, top: `${position.top}px` }}
    >
      <div className="mb-2 inline-flex items-center gap-1.5 text-[15px] font-bold leading-tight">
        <AlertTriangle size={15} />
        <span>Conflicto de horario</span>
      </div>
      <div className="mb-3 text-[13px] leading-relaxed opacity-95">
        Si seleccionás este {bubbleLabelByType[eventType]} va a solapar con:
      </div>
      {conflicts.map(conflict => (
        <div
          key={`${eventId}-${conflict.subjectId}-${conflict.slotId}`}
          className="mb-2.5 last:mb-0 leading-relaxed"
        >
          <div className="truncate text-[14px] font-semibold">
            {conflictSubjectLine(conflict.subjectLabel)}
          </div>
          <div className="truncate text-[13px] opacity-90">
            {conflict.slotKind} {conflict.slotCode} · {dayShort(conflict.day)} {conflict.start}{' '}
            {conflict.end} · {conflict.venue}
          </div>
        </div>
      ))}
      {sortedConflicts.length > 3 ? (
        <div className="mt-1 text-[13px] font-semibold">+{sortedConflicts.length - 3} más</div>
      ) : null}
    </div>,
    document.body
  );
};
