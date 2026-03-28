import type { MutableRefObject } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  SavedElectionDayGroup,
  SavedElectionRow,
  SavedElectionSubjectGroup,
  SavedElectionViewMode,
} from '@/domain/saved-election-views';
import { DAY_LABELS, dayShort, displaySubjectLabel } from '../../scheduler.utils';
import type { SavedConflictOverlayData } from './overlay';

type SavedElectionsPanelContentProps = {
  viewMode: SavedElectionViewMode;
  savedElectionDetailsCount: number;
  savedConflictOverlay: SavedConflictOverlayData | null;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  setSlotRef: (slotId: string, node: HTMLDivElement | null) => void;
  subjectGroups: SavedElectionSubjectGroup[];
  dayGroups: SavedElectionDayGroup[];
  alwaysConflictingSavedSlotIds: Set<string>;
  highlightedConflictSlotIds: Set<string>;
  hoveredSavedConflictSlotId: string | null;
  setHoveredSavedConflictSlotId: (slotId: string | null) => void;
  onRequestDeleteSubject: (subjectId: string) => void;
};

const ROW_KIND_LABEL: Record<SavedElectionRow['kind'], string> = {
  prac: 'Comisión',
  teo: 'Teórico',
  sem: 'Seminario',
};

const rowClassName = ({
  hasAlwaysConflict,
  hasHighlightedConflict,
}: {
  hasAlwaysConflict: boolean;
  hasHighlightedConflict: boolean;
}) =>
  cn(
    'relative rounded px-1 py-1 text-[13px] transition-colors',
    hasAlwaysConflict &&
      'bg-amber-50/80 ring-1 ring-inset ring-amber-300/70 dark:bg-amber-500/15 dark:ring-amber-300/35',
    hasHighlightedConflict &&
      'bg-amber-100/70 ring-1 ring-inset ring-amber-300/70 dark:bg-amber-500/20 dark:ring-amber-300/40'
  );

const toneClass = (kind: SavedElectionRow['kind']) =>
  kind === 'prac' ? 'text-[#861f5c]' : kind === 'teo' ? 'text-[#0f766e]' : 'text-[#d97706]';

type SavedElectionRowLineProps = {
  row: SavedElectionRow;
  setSlotRef: (slotId: string, node: HTMLDivElement | null) => void;
  alwaysConflictingSavedSlotIds: Set<string>;
  highlightedConflictSlotIds: Set<string>;
  hoveredSavedConflictSlotId: string | null;
  setHoveredSavedConflictSlotId: (slotId: string | null) => void;
};

const SavedElectionSubjectRow = ({
  row,
  setSlotRef,
  alwaysConflictingSavedSlotIds,
  highlightedConflictSlotIds,
  hoveredSavedConflictSlotId,
  setHoveredSavedConflictSlotId,
}: SavedElectionRowLineProps) => {
  const colorClass = toneClass(row.kind);
  const hasAlwaysConflict = alwaysConflictingSavedSlotIds.has(row.key);
  const hasHighlightedConflict = highlightedConflictSlotIds.has(row.key);
  const hasConflicts = hasAlwaysConflict;

  return (
    <div
      ref={(node) => {
        setSlotRef(row.key, node);
      }}
      onMouseEnter={() => {
        if (!hasConflicts) return;
        setHoveredSavedConflictSlotId(row.key);
      }}
      onMouseLeave={() => {
        if (hoveredSavedConflictSlotId === row.key) setHoveredSavedConflictSlotId(null);
      }}
      className={cn(
        rowClassName({
          hasAlwaysConflict,
          hasHighlightedConflict,
        }),
        'grid grid-cols-[34px_minmax(0,1fr)_auto_auto] items-center gap-x-2'
      )}
    >
      <span className={cn('w-[34px] text-center font-semibold tabular-nums', colorClass)}>
        {row.code}
      </span>
      <span className={cn('truncate text-[15px] font-semibold', colorClass)}>
        {row.teacherLabel}
      </span>
      <span className="whitespace-nowrap text-[15px] font-medium tabular-nums text-[#6f5866] dark:text-zinc-300">
        {dayShort(row.day)} {row.start} {row.end}
      </span>
      <span
        className={cn('min-w-[56px] text-right text-[15px] font-semibold tabular-nums', colorClass)}
      >
        {row.venue}
      </span>
    </div>
  );
};

const SavedElectionDayRow = ({
  row,
  setSlotRef,
  alwaysConflictingSavedSlotIds,
  highlightedConflictSlotIds,
  hoveredSavedConflictSlotId,
  setHoveredSavedConflictSlotId,
  onRequestDeleteSubject,
}: SavedElectionRowLineProps & {
  onRequestDeleteSubject: (subjectId: string) => void;
}) => {
  const colorClass = toneClass(row.kind);
  const hasAlwaysConflict = alwaysConflictingSavedSlotIds.has(row.key);
  const hasHighlightedConflict = highlightedConflictSlotIds.has(row.key);
  const hasConflicts = hasAlwaysConflict;

  return (
    <div
      ref={(node) => {
        setSlotRef(row.key, node);
      }}
      onMouseEnter={() => {
        if (!hasConflicts) return;
        setHoveredSavedConflictSlotId(row.key);
      }}
      onMouseLeave={() => {
        if (hoveredSavedConflictSlotId === row.key) setHoveredSavedConflictSlotId(null);
      }}
      className={cn(
        rowClassName({
          hasAlwaysConflict,
          hasHighlightedConflict,
        }),
        'flex items-start justify-between gap-3'
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-[14px] font-semibold text-[#4f1237] dark:text-zinc-100">
          {displaySubjectLabel(row.subjectLabel)}
        </div>
        <div
          className={cn(
            'mt-0.5 grid grid-cols-[108px_116px_72px] gap-x-3 text-[13px] font-medium sm:grid-cols-[116px_128px_80px]',
            colorClass
          )}
        >
          <span className="tabular-nums">
            {row.start} {row.end}
          </span>
          <span className="truncate">
            {ROW_KIND_LABEL[row.kind]} {row.code}
          </span>
          <span className="truncate tabular-nums">{row.venue}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onRequestDeleteSubject(row.subjectId);
        }}
        className="shrink-0 pt-0.5 text-[#9f8695] hover:text-[#5a1740] dark:text-zinc-400 dark:hover:text-zinc-200"
        aria-label="Quitar elección"
        title="Quitar elección"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};

export const SavedElectionsPanelContent = ({
  viewMode,
  savedElectionDetailsCount,
  savedConflictOverlay,
  panelRef,
  setSlotRef,
  subjectGroups,
  dayGroups,
  alwaysConflictingSavedSlotIds,
  highlightedConflictSlotIds,
  hoveredSavedConflictSlotId,
  setHoveredSavedConflictSlotId,
  onRequestDeleteSubject,
}: SavedElectionsPanelContentProps) => (
  <div ref={panelRef} className="relative min-h-0 overflow-visible xl:flex-1">
    {savedConflictOverlay ? (
      <>
        <svg
          className="pointer-events-none absolute inset-0 z-10 overflow-visible"
          width="100%"
          height="100%"
          viewBox={`0 0 ${savedConflictOverlay.panelWidth} ${savedConflictOverlay.panelHeight}`}
          preserveAspectRatio="none"
          style={{ overflow: 'visible' }}
        >
          {savedConflictOverlay.segments.length > 1 ? (
            <path
              d={`M ${savedConflictOverlay.trunkX} ${Math.min(...savedConflictOverlay.segments.map((item) => item.y))} L ${savedConflictOverlay.trunkX} ${Math.max(...savedConflictOverlay.segments.map((item) => item.y))}`}
              fill="none"
              stroke="rgba(252, 211, 77, 0.7)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ) : null}
          {savedConflictOverlay.segments.map((segment) => (
            <path
              key={`saved-conflict-segment-${segment.slotId}`}
              d={`M ${savedConflictOverlay.branchStartX} ${segment.y} L ${savedConflictOverlay.trunkX} ${segment.y}`}
              fill="none"
              stroke="rgba(252, 211, 77, 0.7)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
          <path
            d={`M ${savedConflictOverlay.trunkX} ${savedConflictOverlay.bubbleAnchorY} L ${savedConflictOverlay.bubbleLeft + savedConflictOverlay.bubbleWidth} ${savedConflictOverlay.bubbleAnchorY}`}
            fill="none"
            stroke="rgba(252, 211, 77, 0.7)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <div
          className="pointer-events-none absolute z-20 rounded-md border border-amber-300/80 bg-amber-100/90 px-3 py-2 text-[12px] font-medium text-amber-950 shadow-md backdrop-blur-sm dark:border-amber-400/50 dark:bg-amber-500/25 dark:text-amber-100"
          style={{
            left: `${savedConflictOverlay.bubbleLeft}px`,
            top: `${savedConflictOverlay.bubbleTop}px`,
            width: `${savedConflictOverlay.bubbleWidth}px`,
            minHeight: `${savedConflictOverlay.bubbleHeight}px`,
          }}
        >
          <div className="mb-1 inline-flex items-center gap-1 text-[13px] font-bold">
            <AlertTriangle size={14} />
            <span>Conflicto guardado</span>
          </div>
          {savedConflictOverlay.conflicts.slice(0, 3).map((conflict) => (
            <div key={`saved-conflict-bubble-${conflict.slotId}`} className="mt-1.5 leading-tight">
              <div className="truncate font-semibold">{conflict.subjectLabel}</div>
              <div className="truncate opacity-95">{conflict.title}</div>
              <div className="text-[11px] opacity-85">
                Solapa: {dayShort(conflict.day)} {conflict.overlapStart} {conflict.overlapEnd}
              </div>
            </div>
          ))}
          {savedConflictOverlay.conflicts.length > 3 ? (
            <div className="mt-1 text-[11px] font-semibold">
              +{savedConflictOverlay.conflicts.length - 3} más
            </div>
          ) : null}
        </div>
      </>
    ) : null}
    <div className="pr-1 xl:h-full xl:overflow-auto">
      {savedElectionDetailsCount ? (
        viewMode === 'subject' ? (
          <div className="divide-y divide-[#e8d3df] dark:divide-zinc-700">
            {subjectGroups.map((group) => (
              <div key={`saved-${group.subjectId}`} className="relative py-2 text-sm">
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onRequestDeleteSubject(group.subjectId);
                  }}
                  className="absolute right-0 top-2 text-[#9f8695] hover:text-[#5a1740] dark:text-zinc-400 dark:hover:text-zinc-200"
                  aria-label="Quitar elección"
                  title="Quitar elección"
                >
                  <Trash2 size={14} />
                </button>
                <div className="pr-5 text-[15px] font-semibold text-[#4f1237] dark:text-zinc-100">
                  {displaySubjectLabel(group.subjectLabel)}
                </div>
                {group.commissionVacancies === 0 ? (
                  <div className="mt-1 inline-flex items-center gap-1 rounded border border-[#efafc3] bg-[#fff1f5] px-1.5 py-0.5 text-[11px] font-bold text-[#b72f5c] dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-100">
                    <AlertTriangle size={12} />
                    <span>Comisión {group.commissionId} sin vacantes</span>
                  </div>
                ) : null}
                <div className="mt-1 space-y-0.5">
                  {group.rows.map((row) => (
                    <SavedElectionSubjectRow
                      key={row.key}
                      row={row}
                      setSlotRef={setSlotRef}
                      alwaysConflictingSavedSlotIds={alwaysConflictingSavedSlotIds}
                      highlightedConflictSlotIds={highlightedConflictSlotIds}
                      hoveredSavedConflictSlotId={hoveredSavedConflictSlotId}
                      setHoveredSavedConflictSlotId={setHoveredSavedConflictSlotId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {dayGroups.map((group) => (
              <section key={`saved-day-${group.day}`} aria-label={DAY_LABELS[group.day]}>
                <h3 className="mb-1 text-[13px] font-bold uppercase tracking-wide text-[#8a6a7d] dark:text-zinc-400">
                  {DAY_LABELS[group.day]}
                </h3>
                <div className="space-y-1 pl-3 sm:pl-4">
                  {group.rows.map((row) => (
                    <SavedElectionDayRow
                      key={row.key}
                      row={row}
                      setSlotRef={setSlotRef}
                      alwaysConflictingSavedSlotIds={alwaysConflictingSavedSlotIds}
                      highlightedConflictSlotIds={highlightedConflictSlotIds}
                      hoveredSavedConflictSlotId={hoveredSavedConflictSlotId}
                      setHoveredSavedConflictSlotId={setHoveredSavedConflictSlotId}
                      onRequestDeleteSubject={onRequestDeleteSubject}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      ) : (
        <div className="text-xs text-[#7c6272] dark:text-zinc-400">Sin elecciones guardadas.</div>
      )}
    </div>
  </div>
);
