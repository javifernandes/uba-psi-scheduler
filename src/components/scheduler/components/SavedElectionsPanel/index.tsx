'use client';

import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  buildSavedElectionRows,
  groupSavedElectionRowsByDay,
  groupSavedElectionRowsBySubject,
  type SavedElectionViewMode,
} from '@/domain/saved-election-views';
import {
  buildSavedSlotsForConflictAnalysis,
  type SavedElectionsImportPreview,
} from '@/domain/saved-elections';
import type { ReservedSlot, SavedElectionDetail } from '../../scheduler.types';
import { useSavedElectionsViewModel } from '../../hooks/use-saved-elections-view-model';
import { buildSavedConflictOverlay, type SavedConflictOverlayData } from './overlay';
import { SavedElectionsPanelContent } from './content';
import { SavedElectionsImportDialog } from './import-dialog';
import { SavedElectionsToolbar } from './toolbar';

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
  const [viewMode, setViewMode] = useState<SavedElectionViewMode>('subject');
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
  const setSlotRef = (slotId: string, node: HTMLDivElement | null) => {
    slotRefs.current[slotId] = node;
  };
  const savedSubjectsCount = savedElectionDetails.length;
  const hasSavedElections = savedSubjectsCount > 0;
  const savedRows = useMemo(
    () => buildSavedElectionRows(savedElectionDetails),
    [savedElectionDetails]
  );
  const subjectGroups = useMemo(
    () => groupSavedElectionRowsBySubject(savedElectionDetails),
    [savedElectionDetails]
  );
  const dayGroups = useMemo(() => groupSavedElectionRowsByDay(savedRows), [savedRows]);
  const savedSlotsForConflictAnalysis = useMemo(
    () => buildSavedSlotsForConflictAnalysis(savedElectionDetails),
    [savedElectionDetails]
  );

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

  const handleConfirmImport = async () => {
    if (!importPreview) return;
    try {
      setIsImportApplying(true);
      await onApplyImportSelections(importPreview);
      setImportFeedback(`Importación lista: ${importPreview.mapped.length} materias aplicadas.`);
      setIsImportDialogOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo aplicar la importación.';
      setImportError(message);
    } finally {
      setIsImportApplying(false);
    }
  };

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
    if (!hoveredSlot?.title) return null;

    return buildSavedConflictOverlay({
      hoveredSavedConflictSlotId,
      panelWidth: panelRect.width,
      panelHeight: panelRect.height,
      conflictDetails,
      slotCenters,
      hoveredSlot: {
        slotId: hoveredSlot.slotId,
        subjectId: hoveredSlot.subjectId,
        subjectLabel: hoveredSlot.subjectLabel,
        day: hoveredSlot.day,
        start: hoveredSlot.start,
        end: hoveredSlot.end,
        title: hoveredSlot.title,
      },
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
        <SavedElectionsToolbar
          isOpen={isOpen}
          hasSavedElections={hasSavedElections}
          savedSubjectsCount={savedSubjectsCount}
          isDayView={viewMode === 'day'}
          onExportSelections={onExportSelections}
          onOpenImportDialog={() => {
            setImportError(null);
            setImportPreview(null);
            setIsImportDialogOpen(true);
          }}
          onToggleViewMode={() =>
            setViewMode((current) => (current === 'subject' ? 'day' : 'subject'))
          }
          onRemoveAll={() => setPendingDelete({ type: 'all' })}
          onToggleOpen={onToggleOpen}
        />
        {isOpen && importFeedback ? (
          <div className="mb-2 rounded-md border border-[#e9d5e2] bg-white/70 px-2 py-1 text-[11px] text-[#6f5866] dark:border-zinc-700 dark:bg-zinc-800/70 dark:text-zinc-300">
            {importFeedback}
          </div>
        ) : null}
        {isOpen ? (
          <SavedElectionsPanelContent
            viewMode={viewMode}
            savedElectionDetailsCount={savedElectionDetails.length}
            savedConflictOverlay={savedConflictOverlay}
            panelRef={panelRef}
            setSlotRef={setSlotRef}
            subjectGroups={subjectGroups}
            dayGroups={dayGroups}
            alwaysConflictingSavedSlotIds={alwaysConflictingSavedSlotIds}
            highlightedConflictSlotIds={highlightedConflictSlotIds}
            hoveredSavedConflictSlotId={hoveredSavedConflictSlotId}
            setHoveredSavedConflictSlotId={setHoveredSavedConflictSlotId}
            onRequestDeleteSubject={(subjectId) => setPendingDelete({ type: 'single', subjectId })}
          />
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
      <SavedElectionsImportDialog
        isOpen={isImportDialogOpen}
        isImportLoading={isImportLoading}
        isImportApplying={isImportApplying}
        importError={importError}
        importPreview={importPreview}
        importModalInputRef={importModalInputRef}
        importReasonLabel={importReasonLabel}
        onClose={() => setIsImportDialogOpen(false)}
        onHandleImportFile={handleImportFile}
        onConfirmImport={handleConfirmImport}
      />
    </>
  );
};
