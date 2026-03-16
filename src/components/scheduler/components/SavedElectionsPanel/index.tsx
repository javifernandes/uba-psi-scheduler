'use client';

import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Download,
  ChevronDown,
  ChevronRight,
  Trash2,
  Upload,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import type { ReservedSlot, SavedElectionDetail } from '../../scheduler.types';
import {
  dayShort,
  DAYS,
  displaySubjectLabel,
  h2m,
  shortTeacherName,
  splitAula,
} from '../../scheduler.utils';
import { buildSavedConflictOverlay, type SavedConflictOverlayData } from './overlay';
import { useSavedElectionsViewModel } from '../../hooks/use-saved-elections-view-model';
import type { SavedElectionsImportPreview } from '@/domain/saved-elections';

type SavedElectionsPanelProps = {
  isOpen: boolean;
  savedElectionDetails: SavedElectionDetail[];
  savedConflictDetailsBySlot: Record<string, ReservedSlot[]>;
  alwaysConflictingSavedSlotIds: Set<string>;
  highlightedConflictSlotIds: Set<string>;
  onOpenPanel: () => void;
  onToggleOpen: () => void;
};

export const SavedElectionsPanel = ({
  isOpen,
  savedElectionDetails,
  savedConflictDetailsBySlot,
  alwaysConflictingSavedSlotIds,
  highlightedConflictSlotIds,
  onOpenPanel,
  onToggleOpen,
}: SavedElectionsPanelProps) => {
  const {
    onRemoveSavedSubject,
    onRemoveAllSavedSubjects,
    onExportSelections,
    onImportSelections,
    onApplyImportSelections,
  } = useSavedElectionsViewModel();
  const [hoveredSavedConflictSlotId, setHoveredSavedConflictSlotId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<
    { type: 'single'; subjectId: string } | { type: 'all' } | null
  >(null);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isImportLoading, setIsImportLoading] = useState(false);
  const [isImportApplying, setIsImportApplying] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<SavedElectionsImportPreview | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const importModalInputRef = useRef<HTMLInputElement | null>(null);
  const savedSubjectsCount = savedElectionDetails.length;
  const hasSavedElections = savedElectionDetails.length > 0;

  const importReasonLabel = (reason: 'catedra_no_encontrada' | 'comision_no_encontrada') =>
    reason === 'catedra_no_encontrada'
      ? 'No existe esa cátedra en esta oferta.'
      : 'La comisión no existe para esa cátedra.';

  const handleImportFile = async (file: File) => {
    setIsImportLoading(true);
    setImportError(null);
    setImportPreview(null);
    try {
      const preview = await onImportSelections(file);
      setImportPreview(preview);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'No se pudo procesar el archivo de importación.';
      setImportError(message);
    } finally {
      setIsImportLoading(false);
    }
  };

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
    savedElectionDetails.forEach((item) => {
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
    const slotCenters = [hoveredSavedConflictSlotId, ...conflictDetails.map((item) => item.slotId)]
      .map((slotId) => {
        const node = slotRefs.current[slotId];
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return { slotId, y: rect.top - panelRect.top + rect.height / 2 };
      })
      .filter(Boolean) as Array<{ slotId: string; y: number }>;
    if (!slotCenters.length) return null;

    const hoveredSlot = savedSlotsForConflictAnalysis.find(
      (slot) => slot.slotId === hoveredSavedConflictSlotId
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
        data-tour="saved-elections-panel"
        data-testid="saved-elections-panel"
      >
        <div
          className="mb-2 flex cursor-pointer items-center justify-between"
          onClick={onToggleOpen}
        >
          <h2 className="text-sm font-semibold text-[#5a1740] dark:text-zinc-100">
            Mis elecciones
          </h2>
          <div className="flex items-center gap-2">
            {isOpen ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onExportSelections();
                  }}
                  disabled={!hasSavedElections}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-[#8a6a7d] hover:bg-[#f4e8ef] hover:text-[#5a1740] disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Exportar elecciones"
                  title="Exportar elecciones"
                  data-tour="saved-elections-export"
                  data-testid="saved-elections-export"
                >
                  <Download size={12} />
                  Exportar
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setImportError(null);
                    setImportPreview(null);
                    setIsImportDialogOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-[#8a6a7d] hover:bg-[#f4e8ef] hover:text-[#5a1740] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Importar elecciones"
                  title="Importar elecciones"
                  data-tour="saved-elections-import"
                  data-testid="saved-elections-import"
                >
                  <Upload size={12} />
                  Importar
                </button>
              </>
            ) : null}
            {isOpen && hasSavedElections ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
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
              onClick={(e) => {
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
        {isOpen && importFeedback ? (
          <div className="mb-2 rounded-md border border-[#e9d5e2] bg-white/70 px-2 py-1 text-[11px] text-[#6f5866] dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
            {importFeedback}
          </div>
        ) : null}
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
                    <div
                      key={`saved-conflict-bubble-${conflict.slotId}`}
                      className="mt-1.5 leading-tight"
                    >
                      <div className="truncate font-semibold">{conflict.subjectLabel}</div>
                      <div className="truncate opacity-95">{conflict.title}</div>
                      <div className="text-[11px] opacity-85">
                        Solapa: {dayShort(conflict.day)} {conflict.overlapStart}{' '}
                        {conflict.overlapEnd}
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
                {savedElectionDetails.map((item) => {
                  const commissionRoom = splitAula(item.commission.lugar);
                  const teoricoRoom = item.teorico ? splitAula(item.teorico.lugar) : null;
                  const seminarioRoom = item.seminario ? splitAula(item.seminario.lugar) : null;
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
                        onClick={(event) => {
                          event.preventDefault();
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
                      {item.commission.vacantes === 0 ? (
                        <div className="mt-1 inline-flex items-center gap-1 rounded border border-[#efafc3] bg-[#fff1f5] px-1.5 py-0.5 text-[11px] font-bold text-[#b72f5c] dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-100">
                          <AlertTriangle size={12} />
                          <span>Comisión {item.commission.id} sin vacantes</span>
                        </div>
                      ) : null}
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
                              ref={(node) => {
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
                              <span
                                className={cn('truncate text-[15px] font-semibold', colorClass)}
                              >
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
          if (pendingDelete.type === 'all') onRemoveAllSavedSubjects();
          if (pendingDelete.type === 'single') onRemoveSavedSubject(pendingDelete.subjectId);
          setPendingDelete(null);
        }}
      />
      {isImportDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/20 px-3 backdrop-blur-[2px] dark:bg-black/30"
          role="presentation"
          onClick={() => {
            if (isImportLoading || isImportApplying) return;
            setIsImportDialogOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Importar elecciones"
            className="w-full max-w-2xl rounded-xl border border-[#d7b8c9] bg-[#fff8fc] px-4 py-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-[#5a1740] dark:text-zinc-100">
                Importar elecciones
              </h3>
              <button
                type="button"
                onClick={() => setIsImportDialogOpen(false)}
                className="rounded border border-[#d7b8c9] bg-white px-2 py-1 text-xs font-medium text-[#5a1740] hover:bg-[#fdf1f7] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                disabled={isImportLoading || isImportApplying}
              >
                Cerrar
              </button>
            </div>
            <input
              ref={importModalInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = event.target.files?.[0];
                if (!file) return;
                await handleImportFile(file);
                input.value = '';
              }}
            />
            <div
              className={cn(
                'mt-3 rounded-xl border border-dashed border-[#d7b8c9] bg-white/60 p-4 text-sm dark:border-zinc-600 dark:bg-zinc-800/70',
                isImportLoading && 'opacity-70'
              )}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={async (event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (!file) return;
                await handleImportFile(file);
              }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#6f5866] dark:text-zinc-300">
                  Arrastrá un `.json` acá o seleccioná un archivo.
                </span>
                <button
                  type="button"
                  onClick={() => importModalInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#861f5c] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6f184c]"
                  disabled={isImportLoading || isImportApplying}
                >
                  <Upload size={13} />
                  Subir archivo
                </button>
              </div>
            </div>
            {isImportLoading ? (
              <div className="mt-3 inline-flex items-center gap-2 text-sm text-[#6f5866] dark:text-zinc-300">
                <Loader2 size={14} className="animate-spin" />
                Procesando archivo...
              </div>
            ) : null}
            {importError ? (
              <div className="mt-3 rounded-md border border-rose-300/70 bg-rose-100/70 px-3 py-2 text-xs text-rose-900 dark:border-rose-400/40 dark:bg-rose-500/20 dark:text-rose-100">
                {importError}
              </div>
            ) : null}
            {importPreview ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-md border border-[#e9d5e2] bg-white/70 px-3 py-2 text-xs text-[#6f5866] dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
                  Entradas: <strong>{importPreview.totalEntries}</strong> · Aplicables:{' '}
                  <strong>{importPreview.mapped.length}</strong> · Omitidas:{' '}
                  <strong>{importPreview.rejected.length}</strong>
                  {importPreview.period ? ` · Período: ${importPreview.period}` : ''}
                </div>
                <div className="max-h-56 overflow-auto rounded-md border border-[#e9d5e2] bg-white/70 p-2 dark:border-zinc-700 dark:bg-zinc-800/70">
                  {importPreview.mapped.length ? (
                    <div className="divide-y divide-[#e8d3df] dark:divide-zinc-700">
                      {importPreview.mapped.map((item) => (
                        <div key={`${item.subjectId}-${item.comision}`} className="py-1.5 text-xs">
                          <div className="font-semibold text-[#4f1237] dark:text-zinc-100">
                            {displaySubjectLabel(item.subjectLabel)}
                          </div>
                          <div className="text-[#6f5866] dark:text-zinc-300">
                            Cátedra {item.catedra} · Comisión {item.comision}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#7c6272] dark:text-zinc-400">
                      No hay elecciones aplicables en este archivo.
                    </div>
                  )}
                </div>
                {importPreview.rejected.length ? (
                  <div className="max-h-36 overflow-auto rounded-md border border-amber-300/70 bg-amber-100/60 p-2 text-xs text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/20 dark:text-amber-100">
                    <div className="mb-1 font-semibold">Entradas omitidas</div>
                    <div className="space-y-1">
                      {importPreview.rejected.map((item, index) => (
                        <div key={`rejected-${index}`}>
                          Cátedra {item.catedra} · Comisión {item.comision || '(vacía)'}:{' '}
                          {importReasonLabel(item.reason)}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportDialogOpen(false)}
                className="rounded-lg border border-[#d7b8c9] bg-white px-3 py-1.5 text-sm font-medium text-[#5a1740] hover:bg-[#fdf1f7] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                disabled={isImportLoading || isImportApplying}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!importPreview) return;
                  try {
                    setIsImportApplying(true);
                    await onApplyImportSelections(importPreview);
                    setImportFeedback(
                      `Importación lista: ${importPreview.mapped.length} materias aplicadas.`
                    );
                    setIsImportDialogOpen(false);
                  } catch (error) {
                    const message =
                      error instanceof Error ? error.message : 'No se pudo aplicar la importación.';
                    setImportError(message);
                  } finally {
                    setIsImportApplying(false);
                  }
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-[#861f5c] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#6f184c] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={
                  isImportLoading ||
                  isImportApplying ||
                  !importPreview ||
                  importPreview.mapped.length === 0
                }
              >
                {isImportApplying ? <Loader2 size={14} className="animate-spin" /> : null}
                Confirmar importación
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
