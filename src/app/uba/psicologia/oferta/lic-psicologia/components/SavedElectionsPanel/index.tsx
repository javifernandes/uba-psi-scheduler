'use client';

import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ReservedSlot, SavedElectionDetail } from '../../psicologia-scheduler.types';
import {
  dayShort,
  DAYS,
  displaySubjectLabel,
  h2m,
  shortTeacherName,
  splitAula,
} from '../../psicologia-scheduler.utils';
import { buildSavedConflictOverlay, type SavedConflictOverlayData } from './overlay';

type SavedElectionsPanelProps = {
  isOpen: boolean;
  savedSubjectsCount: number;
  savedElectionDetails: SavedElectionDetail[];
  savedConflictDetailsBySlot: Record<string, ReservedSlot[]>;
  alwaysConflictingSavedSlotIds: Set<string>;
  highlightedConflictSlotIds: Set<string>;
  onOpenPanel: () => void;
  onToggleOpen: () => void;
  onRemoveSubject: (subjectId: string) => void;
  onRemoveAllSubjects: () => void;
};

export const SavedElectionsPanel = ({
  isOpen,
  savedSubjectsCount,
  savedElectionDetails,
  savedConflictDetailsBySlot,
  alwaysConflictingSavedSlotIds,
  highlightedConflictSlotIds,
  onOpenPanel,
  onToggleOpen,
  onRemoveSubject,
  onRemoveAllSubjects,
}: SavedElectionsPanelProps) => {
  const [hoveredSavedConflictSlotId, setHoveredSavedConflictSlotId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    { type: 'single'; subjectId: string } | { type: 'all' } | null
  >(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasSavedElections = savedElectionDetails.length > 0;

  const savedSlotsForConflictAnalysis = useMemo(() => {
    const savedSlots: Array<{
      slotId: string;
      subjectId: string;
      subjectLabel: string;
      day: SavedElectionDetail['commission']['dia'];
      start: string;
      end: string;
      title: string;
    }> = [];
    savedElectionDetails.forEach(item => {
      savedSlots.push({
        slotId: `${item.subject.id}|prac|${item.commission.id}`,
        subjectId: item.subject.id,
        subjectLabel: item.subject.label,
        day: item.commission.dia,
        start: item.commission.inicio,
        end: item.commission.fin,
        title: `${item.commission.id} - ${shortTeacherName(item.commission.profesor, 30)}`,
      });
      if (item.teorico) {
        savedSlots.push({
          slotId: `${item.subject.id}|teo|${item.teorico.id}`,
          subjectId: item.subject.id,
          subjectLabel: item.subject.label,
          day: item.teorico.dia,
          start: item.teorico.inicio,
          end: item.teorico.fin,
          title: `${item.teorico.id} - ${shortTeacherName(item.teorico.profesor, 30)}`,
        });
      }
      if (item.seminario) {
        savedSlots.push({
          slotId: `${item.subject.id}|sem|${item.seminario.id}`,
          subjectId: item.subject.id,
          subjectLabel: item.subject.label,
          day: item.seminario.dia,
          start: item.seminario.inicio,
          end: item.seminario.fin,
          title: `${item.seminario.id} - ${shortTeacherName(item.seminario.profesor, 30)}`,
        });
      }
    });
    return savedSlots;
  }, [savedElectionDetails]);

  const savedConflictOverlay = useMemo<SavedConflictOverlayData | null>(() => {
    if (!hoveredSavedConflictSlotId) return null;
    const panel = panelRef.current;
    const hoveredSlotNode = slotRefs.current[hoveredSavedConflictSlotId];
    const conflictDetails = savedConflictDetailsBySlot[hoveredSavedConflictSlotId] || [];
    if (!panel || !hoveredSlotNode || !conflictDetails.length) return null;

    const panelRect = panel.getBoundingClientRect();
    const slotCenters = [hoveredSavedConflictSlotId, ...conflictDetails.map(item => item.slotId)]
      .map(slotId => {
        const node = slotRefs.current[slotId];
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return { slotId, y: rect.top - panelRect.top + rect.height / 2 };
      })
      .filter(Boolean) as Array<{ slotId: string; y: number }>;
    if (!slotCenters.length) return null;

    const hoveredSlot = savedSlotsForConflictAnalysis.find(
      slot => slot.slotId === hoveredSavedConflictSlotId
    );
    if (!hoveredSlot) return null;

    return buildSavedConflictOverlay({
      hoveredSavedConflictSlotId,
      panelHeight: panelRect.height,
      conflictDetails,
      slotCenters,
      hoveredSlot,
    });
  }, [hoveredSavedConflictSlotId, savedConflictDetailsBySlot, savedSlotsForConflictAnalysis]);

  return (
    <>
      <article
        onClick={onOpenPanel}
        className={cn(
          'order-5 relative overflow-visible rounded-xl border border-[#d7b8c9] bg-[#fff8fc] px-3 pt-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-zinc-700 dark:bg-zinc-900/95',
          isOpen && 'flex min-h-0 flex-col xl:h-full',
          !isOpen && 'cursor-pointer',
          isOpen ? 'pb-3' : 'pb-1.5'
        )}
      >
        <div
          className="mb-2 flex cursor-pointer items-center justify-between"
          onClick={onToggleOpen}
        >
        <h2 className="text-sm font-semibold text-[#5a1740] dark:text-zinc-100">Mis elecciones</h2>
        <div className="flex items-center gap-2">
          {isOpen && hasSavedElections ? (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setPendingDelete({ type: 'all' });
              }}
              className="text-[#9f8695] hover:text-[#5a1740] dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="Quitar todas las elecciones"
              title="Quitar todas las elecciones"
            >
              <Trash2 size={14} />
            </button>
          ) : null}
          {!isOpen ? (
            <span className="text-[11px] text-[#9f8695] dark:text-zinc-400">
              {savedSubjectsCount}
            </span>
          ) : null}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onToggleOpen();
            }}
            className="text-[#9f8695] hover:text-[#6d5162] dark:text-zinc-400 dark:hover:text-zinc-200"
            aria-label="Expandir o colapsar Mis elecciones"
          >
            {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
        </div>
        {isOpen ? (
          <div ref={panelRef} className="relative min-h-0 overflow-visible xl:flex-1">
          {savedConflictOverlay ? (
            <>
              <svg
                className="pointer-events-none absolute inset-0 z-10 overflow-visible"
                width="100%"
                height="100%"
                viewBox={`0 0 ${Math.max(1, panelRef.current?.clientWidth || 1)} ${Math.max(1, panelRef.current?.clientHeight || 1)}`}
                preserveAspectRatio="none"
                style={{ overflow: 'visible' }}
              >
                {savedConflictOverlay.segments.length > 1 ? (
                  <path
                    d={`M ${savedConflictOverlay.trunkX} ${Math.min(...savedConflictOverlay.segments.map(item => item.y))} L ${savedConflictOverlay.trunkX} ${Math.max(...savedConflictOverlay.segments.map(item => item.y))}`}
                    fill="none"
                    stroke="rgba(252, 211, 77, 0.7)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                ) : null}
                {savedConflictOverlay.segments.map(segment => (
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
                {savedConflictOverlay.conflicts.slice(0, 3).map(conflict => (
                  <div
                    key={`saved-conflict-bubble-${conflict.slotId}`}
                    className="mt-1.5 leading-tight"
                  >
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
              <div className="divide-y divide-[#e8d3df] dark:divide-zinc-700">
                {savedElectionDetails.map(item => {
                const commissionRoom = splitAula(item.commission.aula);
                const teoricoRoom = item.teorico ? splitAula(item.teorico.aula) : null;
                const seminarioRoom = item.seminario ? splitAula(item.seminario.aula) : null;
                const commissionConflictKey = `${item.subject.id}|prac|${item.commission.id}`;
                const teoricoConflictKey = item.teorico
                  ? `${item.subject.id}|teo|${item.teorico.id}`
                  : null;
                const seminarioConflictKey = item.seminario
                  ? `${item.subject.id}|sem|${item.seminario.id}`
                  : null;
                const commissionConflictDetails =
                  savedConflictDetailsBySlot[commissionConflictKey] || [];
                const teoricoConflictDetails = teoricoConflictKey
                  ? savedConflictDetailsBySlot[teoricoConflictKey] || []
                  : [];
                const seminarioConflictDetails = seminarioConflictKey
                  ? savedConflictDetailsBySlot[seminarioConflictKey] || []
                  : [];
                return (
                  <div key={`saved-${item.subject.id}`} className="relative py-2 text-sm">
                    <button
                      type="button"
                      onClick={event => {
                        event.stopPropagation();
                        setPendingDelete({ type: 'single', subjectId: item.subject.id });
                      }}
                      className="absolute right-0 top-2 text-[#9f8695] hover:text-[#5a1740] dark:text-zinc-400 dark:hover:text-zinc-200"
                      aria-label="Quitar elección"
                      title="Quitar elección"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="pr-5 text-[15px] font-semibold text-[#4f1237] dark:text-zinc-100">
                      {displaySubjectLabel(item.subject.label)}
                    </div>
                    {[
                      {
                        kind: 'prac' as const,
                        key: commissionConflictKey,
                        code: item.commission.id,
                        profesor: item.commission.profesor,
                        dia: item.commission.dia,
                        inicio: item.commission.inicio,
                        fin: item.commission.fin,
                        venue: commissionRoom.prefix,
                        hasConflicts: commissionConflictDetails.length > 0,
                      },
                      ...(item.teorico
                        ? [
                            {
                              kind: 'teo' as const,
                              key: teoricoConflictKey!,
                              code: item.teorico.id,
                              profesor: item.teorico.profesor,
                              dia: item.teorico.dia,
                              inicio: item.teorico.inicio,
                              fin: item.teorico.fin,
                              venue: teoricoRoom?.prefix || '',
                              hasConflicts: teoricoConflictDetails.length > 0,
                            },
                          ]
                        : []),
                      ...(item.seminario
                        ? [
                            {
                              kind: 'sem' as const,
                              key: seminarioConflictKey!,
                              code: item.seminario.id,
                              profesor: item.seminario.profesor,
                              dia: item.seminario.dia,
                              inicio: item.seminario.inicio,
                              fin: item.seminario.fin,
                              venue: seminarioRoom?.prefix || '',
                              hasConflicts: seminarioConflictDetails.length > 0,
                            },
                          ]
                        : []),
                    ]
                      .sort((a, b) => {
                        const dayDiff = DAYS.indexOf(a.dia) - DAYS.indexOf(b.dia);
                        if (dayDiff !== 0) return dayDiff;
                        const timeDiff = h2m(a.inicio) - h2m(b.inicio);
                        if (timeDiff !== 0) return timeDiff;
                        return h2m(a.fin) - h2m(b.fin);
                      })
                      .map((part, index) => {
                        const colorClass =
                          part.kind === 'prac'
                            ? 'text-[#861f5c]'
                            : part.kind === 'teo'
                              ? 'text-[#0f766e]'
                              : 'text-[#d97706]';
                        return (
                          <div
                            key={part.key}
                            ref={node => {
                              slotRefs.current[part.key] = node;
                            }}
                            onMouseEnter={() => {
                              if (!part.hasConflicts) return;
                              setHoveredSavedConflictSlotId(part.key);
                            }}
                            onMouseLeave={() => {
                              if (hoveredSavedConflictSlotId === part.key)
                                setHoveredSavedConflictSlotId(null);
                            }}
                            className={cn(
                              'relative grid grid-cols-[34px_1fr_1fr_32px] items-center gap-x-2 rounded px-1 py-0.5 text-[13px] transition-colors',
                              index === 0 ? 'mt-1' : 'mt-0.5',
                              alwaysConflictingSavedSlotIds.has(part.key) &&
                                'bg-amber-50/80 ring-1 ring-inset ring-amber-300/70 dark:bg-amber-500/15 dark:ring-amber-300/35',
                              highlightedConflictSlotIds.has(part.key) &&
                                'bg-amber-100/70 ring-1 ring-inset ring-amber-300/70 dark:bg-amber-500/20 dark:ring-amber-300/40'
                            )}
                          >
                            <span
                              className={cn(
                                'w-[34px] text-center font-semibold tabular-nums',
                                colorClass
                              )}
                            >
                              {part.code}
                            </span>
                            <span className={cn('truncate text-[15px] font-semibold', colorClass)}>
                              {shortTeacherName(part.profesor, 24)}
                            </span>
                            <span className="whitespace-nowrap text-[15px] font-medium tabular-nums text-[#6f5866] dark:text-zinc-300">
                              {dayShort(part.dia)} {part.inicio} {part.fin}
                            </span>
                            <span
                              className={cn(
                                'w-[32px] text-right text-[15px] font-semibold tabular-nums',
                                colorClass
                              )}
                            >
                              {part.venue}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                );
              })}
              {!savedElectionDetails.length ? (
                <div className="text-xs text-[#7c6272] dark:text-zinc-400">
                  Sin elecciones guardadas.
                </div>
              ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </article>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={
          pendingDelete?.type === 'all'
            ? '¿Borrar todas las materias guardadas?'
            : '¿Quitar esta materia guardada?'
        }
        description="Esta acción no se puede deshacer."
        confirmLabel={pendingDelete?.type === 'all' ? 'Borrar todo' : 'Quitar materia'}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.type === 'all') onRemoveAllSubjects();
          if (pendingDelete.type === 'single') onRemoveSubject(pendingDelete.subjectId);
          setPendingDelete(null);
        }}
      />
    </>
  );
};
