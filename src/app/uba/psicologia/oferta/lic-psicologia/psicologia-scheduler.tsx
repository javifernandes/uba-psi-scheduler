'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ParsedSubject, SubjectData } from './psicologia-scheduler.types';
import { captureEvent } from '@/lib/posthog';
import { cn } from '@/lib/utils';
import {
  CalendarGrid,
  SavedElectionsPanel,
  SchedulerFiltersPanel,
  WarningBanner,
} from './components';
import {
  useSchedulerCalendar,
  useSchedulerConflicts,
  useSchedulerFiltersActions,
  useSchedulerPersistence,
  useSchedulerSubjectsData,
  useSubjectDropdown,
} from './hooks';
import {
  buildEnrollmentsExportPayload,
  catedraNumberFromLabel,
  displayHeaderLabel,
  displaySubjectLabel,
  type EnrollmentProjectionMappedEntry,
  type EnrollmentProjectionRejectedEntry,
  mapProjectionEnrollmentsToSubjectMap,
  parseEnrollmentsImportPayload,
} from './psicologia-scheduler.utils';
export type { SubjectData } from './psicologia-scheduler.types';

type PsicologiaSchedulerProps = {
  subjects: SubjectData[];
  careerLabel?: string;
  storageKey?: string;
};

type ImportPreviewData = {
  period: string;
  totalEntries: number;
  mapped: EnrollmentProjectionMappedEntry[];
  rejected: EnrollmentProjectionRejectedEntry[];
  mappedBySubject: Record<string, string>;
};

const EmptySubjectsState = () => (
  <div className="box-border min-h-dvh bg-[radial-gradient(circle_at_0%_0%,#f4dde9_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#f9edf4_0%,transparent_35%),#f8f2f5] px-3 py-4 dark:bg-[radial-gradient(circle_at_0%_0%,#3a1b2c_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#231725_0%,transparent_35%),#0f0b12] md:px-5">
    <section className="mx-auto w-full max-w-[980px] rounded-xl border border-[#ead9e2] bg-white p-6 text-sm text-[#4f1237] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
      No hay materias cargadas. Ejecutá el scraper para generar JSONs en la carpeta de materias.
    </section>
  </div>
);

const EMPTY_SELECTED_SUBJECT: ParsedSubject = {
  id: '',
  label: '',
  header: '',
  teoricos: [],
  seminarios: [],
  comisiones: [],
  teoricoMap: {},
  seminarioMap: {},
};

const PsicologiaSchedulerContent = ({
  subjects,
  careerLabel = 'Lic. Psicología UBA',
  storageKey,
}: PsicologiaSchedulerProps) => {
  const isFirstSubjectRender = useRef(true);
  const [showComisiones, setShowComisiones] = useState(true);
  const [showTeoricos, setShowTeoricos] = useState(false);
  const [showSeminarios, setShowSeminarios] = useState(false);
  const [showOtherSubjects, setShowOtherSubjects] = useState(true);
  const [isMateriaPanelOpen, setIsMateriaPanelOpen] = useState(true);
  const [isSedesPanelOpen, setIsSedesPanelOpen] = useState(true);
  const [isMostrarPanelOpen, setIsMostrarPanelOpen] = useState(true);
  const [isComisionesPanelOpen, setIsComisionesPanelOpen] = useState(true);
  const [isEleccionesPanelOpen, setIsEleccionesPanelOpen] = useState(true);
  const [isCommissionDropdownOpen, setIsCommissionDropdownOpen] = useState(false);
  const [commissionQuery, setCommissionQuery] = useState('');
  const [hoveredCommissionId, setHoveredCommissionId] = useState<string | null>(null);
  const [hoveredConflictEventId, setHoveredConflictEventId] = useState<string | null>(null);
  const [pinnedCommissionId, setPinnedCommissionId] = useState<string | null>(null);
  const [stackIndexBySlot, setStackIndexBySlot] = useState<Record<string, number>>({});
  const [dismissConflictWarning, setDismissConflictWarning] = useState(false);

  const {
    selectedSubjectId,
    setSelectedSubjectId,
    enrolledBySubject,
    setEnrolledBySubject,
    materiaCodeBySubjectId,
    applyEnrollmentRule,
  } = useSchedulerPersistence({
    subjects,
    storageKey: storageKey || 'uba_psico_planner_v1',
  });

  const resetSelectionState = useCallback(() => {
    setHoveredCommissionId(null);
    setHoveredConflictEventId(null);
    setPinnedCommissionId(null);
    setStackIndexBySlot({});
    setCommissionQuery('');
  }, []);

  const {
    parsedSubjects,
    selectedSubject,
    allVenues,
    selectedVenues,
    setSelectedVenues,
    selectedCommissionIds,
    setSelectedCommissionIds,
    filteredComisiones,
    filteredTeoricos,
    filteredSeminarios,
    selectedComisiones,
    searchedComisiones,
  } = useSchedulerSubjectsData({
    subjects,
    selectedSubjectId,
    commissionQuery,
    onSubjectChanged: resetSelectionState,
  });
  const savedSubjects = useMemo(
    () => subjects.filter(subject => enrolledBySubject[subject.id]),
    [subjects, enrolledBySubject]
  );
  const selectedSubjectForCalendar = selectedSubject ?? EMPTY_SELECTED_SUBJECT;
  const conflictingSubject = useMemo(() => {
    if (!selectedSubject) return null;
    const currentMateria = materiaCodeBySubjectId[selectedSubject.id];
    if (!currentMateria) return null;
    const conflictId = Object.keys(enrolledBySubject).find(
      subjectId =>
        subjectId !== selectedSubject.id && materiaCodeBySubjectId[subjectId] === currentMateria
    );
    if (!conflictId) return null;
    return subjects.find(subject => subject.id === conflictId) || null;
  }, [enrolledBySubject, materiaCodeBySubjectId, selectedSubject, subjects]);
  const conflictingCatedraLabel =
    conflictingSubject?.label.match(/Cátedra\s+\d+/i)?.[0] || 'cátedra seleccionada';
  const hasTeoricos = selectedSubject ? selectedSubject.teoricos.length > 0 : false;
  const hasSeminarios = selectedSubject ? selectedSubject.seminarios.length > 0 : false;

  useEffect(() => {
    setDismissConflictWarning(false);
  }, [conflictingSubject?.id, selectedSubject?.id]);

  useEffect(() => {
    if (!hasTeoricos && showTeoricos) setShowTeoricos(false);
    if (!hasSeminarios && showSeminarios) setShowSeminarios(false);
  }, [hasTeoricos, hasSeminarios, showTeoricos, showSeminarios]);

  useEffect(() => {
    if (selectedSubject) return;
    if (!showOtherSubjects) setShowOtherSubjects(true);
  }, [selectedSubject, showOtherSubjects]);

  useEffect(() => {
    if (!selectedSubject) return;
    if (isFirstSubjectRender.current) {
      isFirstSubjectRender.current = false;
      return;
    }
    captureEvent('scheduler_subject_changed', {
      subject_id: selectedSubject.id,
      subject_label: selectedSubject.label,
    });
  }, [selectedSubject]);
  const {
    isMateriaDropdownOpen,
    setIsMateriaDropdownOpen,
    materiaInputValue,
    highlightedSubjectIndex,
    setHighlightedSubjectIndex,
    materiaDropdownRef,
    materiaInputRef,
    optionRefs,
    groupedSubjectOptions,
    flatSelectableSubjects,
    onMateriaInputChange,
    selectSubject,
    focusOptionByIndex,
    onMateriaInputKeyDown,
  } = useSubjectDropdown({
    subjects,
    selectedSubjectId,
    selectedSubjectLabel: selectedSubject ? displaySubjectLabel(selectedSubject.label) : '',
    setSelectedSubjectId,
  });
  const { enrolledCurrentCommissionId, activeCommission, events, visibleEventSlots } =
    useSchedulerCalendar({
      selectedSubject: selectedSubjectForCalendar,
      enrolledBySubject,
      selectedComisiones,
      filteredTeoricos,
      filteredSeminarios,
      parsedSubjects,
      showComisiones,
      showTeoricos,
      showSeminarios,
      showOtherSubjects,
      hoveredCommissionId,
      pinnedCommissionId,
      stackIndexBySlot,
    });
  const {
    savedElectionDetails,
    savedConflictDetailsBySlot,
    alwaysConflictingSavedSlotIds,
    conflictByEventId,
    highlightedConflictSlotIds,
  } = useSchedulerConflicts({
    savedSubjects,
    parsedSubjects,
    enrolledBySubject,
    selectedSubjectId: selectedSubject?.id || '',
    events,
    hoveredConflictEventId,
  });
  const {
    toggleVenue,
    setOnlyVenue,
    setOnlyContent,
    toggleCommission,
    selectAllVisible,
    clearVisible,
  } = useSchedulerFiltersActions({
    searchedComisiones,
    setSelectedVenues,
    setShowComisiones,
    setShowTeoricos,
    setShowSeminarios,
    setShowOtherSubjects,
    setSelectedCommissionIds,
    setPinnedCommissionId,
    setHoveredCommissionId,
  });

  return (
    <div className="box-border h-dvh bg-[radial-gradient(circle_at_0%_0%,#f4dde9_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#f9edf4_0%,transparent_35%),#f8f2f5] px-3 py-4 dark:bg-[radial-gradient(circle_at_0%_0%,#3a1b2c_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#231725_0%,transparent_35%),#0f0b12] md:px-5">
      <section className="mx-auto flex h-full w-full max-w-[1800px] min-h-0 flex-col gap-2">
        <div className="rounded-2xl bg-[#861f5c] px-4 py-2 shadow-sm">
          <h1 className="flex items-center gap-2 text-lg tracking-tight text-white md:text-xl">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/70 bg-white/10 text-base font-black">
              Ψ
            </span>
            <span className="font-bold">
              {selectedSubject ? displayHeaderLabel(selectedSubject.header) : careerLabel}
            </span>
          </h1>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-2">
          <div className="min-h-0 xl:pr-1">
            <div className="relative h-full overflow-auto rounded-xl border border-[#e8d8e1] bg-white/90 dark:border-zinc-700 dark:bg-zinc-900/80">
              {conflictingSubject && !dismissConflictWarning ? (
                <WarningBanner
                  catedraLabel={conflictingCatedraLabel}
                  onDismiss={() => setDismissConflictWarning(true)}
                />
              ) : null}
              <CalendarGrid
                visibleEventSlots={visibleEventSlots}
                activeCommission={activeCommission}
                selectedSubjectId={selectedSubject?.id || ''}
                enrolledBySubject={enrolledBySubject}
                enrolledCurrentCommissionId={enrolledCurrentCommissionId}
                conflictByEventId={conflictByEventId}
                hoveredConflictEventId={hoveredConflictEventId}
                setHoveredConflictEventId={setHoveredConflictEventId}
                hoveredCommissionId={hoveredCommissionId}
                setHoveredCommissionId={setHoveredCommissionId}
                pinnedCommissionId={pinnedCommissionId}
                setPinnedCommissionId={setPinnedCommissionId}
                setStackIndexBySlot={setStackIndexBySlot}
                onToggleEnrollment={commissionId =>
                  setEnrolledBySubject(prev => {
                    if (!selectedSubject) return prev;
                    const isRemoving = prev[selectedSubject.id] === commissionId;
                    captureEvent('scheduler_enrollment_toggled', {
                      subject_id: selectedSubject.id,
                      commission_id: commissionId,
                      action: isRemoving ? 'remove' : 'set',
                    });
                    if (prev[selectedSubject.id] === commissionId) {
                      return applyEnrollmentRule(prev, selectedSubject.id, undefined);
                    }
                    return applyEnrollmentRule(prev, selectedSubject.id, commissionId);
                  })
                }
              />
            </div>
          </div>

          <aside className="grid min-h-0 gap-2 md:grid-cols-2 xl:flex xl:h-full xl:flex-col">
            <SchedulerFiltersPanel
              selectedSubjectLabel={
                selectedSubject
                  ? displaySubjectLabel(selectedSubject.label)
                  : 'Buscar / Seleccionar Materia'
              }
              selectedSubjectId={selectedSubject?.id || ''}
              isMateriaPanelOpen={isMateriaPanelOpen}
              setIsMateriaPanelOpen={setIsMateriaPanelOpen}
              isMateriaDropdownOpen={isMateriaDropdownOpen}
              setIsMateriaDropdownOpen={setIsMateriaDropdownOpen}
              materiaDropdownRef={materiaDropdownRef}
              materiaInputRef={materiaInputRef}
              materiaInputValue={materiaInputValue}
              onMateriaInputChange={onMateriaInputChange}
              onMateriaInputKeyDown={onMateriaInputKeyDown}
              onClearSelectedSubject={() => {
                captureEvent('scheduler_subject_cleared');
                setSelectedSubjectId('');
              }}
              groupedSubjectOptions={groupedSubjectOptions}
              flatSelectableSubjectsLength={flatSelectableSubjects.length}
              highlightedSubjectIndex={highlightedSubjectIndex}
              setHighlightedSubjectIndex={setHighlightedSubjectIndex}
              selectSubject={selectSubject}
              focusOptionByIndex={focusOptionByIndex}
              optionRefs={optionRefs}
              isSedesPanelOpen={isSedesPanelOpen}
              setIsSedesPanelOpen={setIsSedesPanelOpen}
              allVenues={allVenues}
              selectedVenues={selectedVenues}
              toggleVenue={venue => {
                captureEvent('scheduler_venue_toggled', {
                  venue,
                  selected_before: selectedVenues.has(venue),
                });
                toggleVenue(venue);
              }}
              setOnlyVenue={venue => {
                captureEvent('scheduler_venue_set_only', { venue });
                setOnlyVenue(venue);
              }}
              isMostrarPanelOpen={isMostrarPanelOpen}
              setIsMostrarPanelOpen={setIsMostrarPanelOpen}
              showComisiones={showComisiones}
              setShowComisiones={setShowComisiones}
              hasTeoricos={hasTeoricos}
              showTeoricos={showTeoricos}
              setShowTeoricos={setShowTeoricos}
              hasSeminarios={hasSeminarios}
              showSeminarios={showSeminarios}
              setShowSeminarios={setShowSeminarios}
              showOtherSubjects={showOtherSubjects}
              setShowOtherSubjects={setShowOtherSubjects}
              setOnlyContent={contentType => {
                captureEvent('scheduler_content_set_only', { content_type: contentType });
                setOnlyContent(contentType);
              }}
              isComisionesPanelOpen={isComisionesPanelOpen}
              setIsComisionesPanelOpen={setIsComisionesPanelOpen}
              selectedComisionesLength={selectedComisiones.length}
              filteredComisionesLength={filteredComisiones.length}
              isCommissionDropdownOpen={isCommissionDropdownOpen}
              setIsCommissionDropdownOpen={setIsCommissionDropdownOpen}
              selectAllVisible={() => {
                captureEvent('scheduler_commissions_select_all_visible', {
                  visible_count: searchedComisiones.length,
                });
                selectAllVisible();
              }}
              clearVisible={() => {
                captureEvent('scheduler_commissions_clear_visible', {
                  visible_count: searchedComisiones.length,
                });
                clearVisible();
              }}
              commissionQuery={commissionQuery}
              setCommissionQuery={setCommissionQuery}
              searchedComisiones={searchedComisiones}
              selectedCommissionIds={selectedCommissionIds}
              toggleCommission={commissionId => {
                captureEvent('scheduler_commission_toggled', {
                  commission_id: commissionId,
                  selected_before: selectedCommissionIds.has(commissionId),
                });
                toggleCommission(commissionId);
              }}
            />
            <div
              className={cn(
                'order-5 min-h-0 md:col-span-2',
                isEleccionesPanelOpen && 'xl:flex-1'
              )}
            >
              <SavedElectionsPanel
                isOpen={isEleccionesPanelOpen}
                savedSubjectsCount={savedSubjects.length}
                savedElectionDetails={savedElectionDetails}
                savedConflictDetailsBySlot={savedConflictDetailsBySlot}
                alwaysConflictingSavedSlotIds={alwaysConflictingSavedSlotIds}
                highlightedConflictSlotIds={highlightedConflictSlotIds}
                onOpenPanel={() => {
                  if (!isEleccionesPanelOpen) setIsEleccionesPanelOpen(true);
                }}
                onToggleOpen={() => setIsEleccionesPanelOpen(v => !v)}
                onRemoveSubject={subjectId =>
                  setEnrolledBySubject(prev => {
                    captureEvent('scheduler_saved_subject_removed', { subject_id: subjectId });
                    const next = { ...prev };
                    delete next[subjectId];
                    return next;
                  })
                }
                onRemoveAllSubjects={() =>
                  setEnrolledBySubject(prev => {
                    const removed_count = Object.keys(prev).length;
                    captureEvent('scheduler_saved_subjects_cleared', { removed_count });
                    return {};
                  })
                }
                onExportSelections={() => {
                  if (typeof window === 'undefined') return;
                  const period = (() => {
                    const now = new Date();
                    const year = now.getFullYear();
                    const term = now.getMonth() < 7 ? '01' : '02';
                    return `${year}-${term}`;
                  })();
                  const projectedEnrollments = Object.entries(enrolledBySubject).reduce<
                    Array<{ catedra: number; comision: number | string }>
                  >((acc, [subjectId, commissionId]) => {
                    const subject = subjects.find(item => item.id === subjectId);
                    if (!subject) return acc;
                    const catedra = catedraNumberFromLabel(subject.label);
                    if (!Number.isFinite(catedra)) return acc;
                    acc.push({
                      catedra,
                      comision: /^\d+$/.test(commissionId)
                        ? Number.parseInt(commissionId, 10)
                        : commissionId,
                    });
                    return acc;
                  }, []);
                  const payload = buildEnrollmentsExportPayload(projectedEnrollments, period);
                  const blob = new Blob([JSON.stringify(payload, null, 2)], {
                    type: 'application/json',
                  });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  const timestamp = new Date()
                    .toISOString()
                    .replace(/[:]/g, '-')
                    .replace(/\..+$/, '');
                  link.href = url;
                  link.download = `uba-psi-elecciones-v${payload.version}-${timestamp}.json`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                  URL.revokeObjectURL(url);
                  captureEvent('scheduler_saved_subjects_exported', {
                    total_subjects: Object.keys(enrolledBySubject).length,
                  });
                }}
                onImportSelections={async file => {
                  const raw = await file.text();
                  const parsed = parseEnrollmentsImportPayload(raw);
                  const mapped = mapProjectionEnrollmentsToSubjectMap(parsed.enrollments, subjects);
                  const preview: ImportPreviewData = {
                    period: parsed.period,
                    totalEntries: parsed.enrollments.length,
                    mapped: mapped.mapped,
                    rejected: mapped.rejected,
                    mappedBySubject: mapped.mappedBySubject,
                  };
                  return preview;
                }}
                onApplyImportSelections={async preview => {
                  if (
                    preview.totalEntries > 0 &&
                    Object.keys(preview.mappedBySubject).length === 0
                  ) {
                    throw new Error(
                      'No se pudo mapear ninguna elección. Verificá que el archivo corresponda a esta oferta/carrera.'
                    );
                  }
                  setEnrolledBySubject(preview.mappedBySubject);
                  captureEvent('scheduler_saved_subjects_imported', {
                    imported_subjects: preview.totalEntries,
                    applied_subjects: Object.keys(preview.mappedBySubject).length,
                    rejected_subjects: preview.rejected.length,
                  });
                }}
              />
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
};

export const PsicologiaScheduler = (props: PsicologiaSchedulerProps) => {
  const { subjects } = props;
  if (!subjects.length) return <EmptySubjectsState />;
  return <PsicologiaSchedulerContent {...props} />;
};
