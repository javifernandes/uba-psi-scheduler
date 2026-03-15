'use client';

import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import type { ParsedSubject, SubjectData } from './scheduler.types';
import { MobileDesktopWarning } from '@/components/mobile-desktop-warning';
import { sumKnownVacancies } from '@/domain/vacancies';
import type { PeriodId } from '@/lib/period';
import { useAppStore } from '@/store/app-store';
import {
  CalendarGrid,
  SavedElectionsPanel,
  SchedulerCalendarSection,
  SchedulerHeader,
  SchedulerFiltersPanel,
  SchedulerRightPanel,
} from './components';
import {
  useSchedulerCalendar,
  useSchedulerCallbacks,
  useSchedulerConflicts,
  useSchedulerFiltersActions,
  useSchedulerPersistence,
  useSchedulerSubjectsData,
  useSchedulerTelemetryEffects,
  useSchedulerTour,
  useSubjectDropdown,
} from './hooks';
import { displayHeaderLabel, displaySubjectLabel, slotsByTipo } from './scheduler.utils';
export type { SubjectData } from './scheduler.types';

type SchedulerProps = {
  subjects: SubjectData[];
  period: PeriodId;
  careerLabel?: string;
  careerSlug?: string;
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
  slots: [],
  comisiones: [],
  slotMap: {},
};

const SchedulerContent = ({
  subjects,
  period,
  careerLabel = 'Lic. Psicología UBA',
  careerSlug = 'lic-psicologia',
}: SchedulerProps) => {
  const currentPeriod = useAppStore((state) => state.currentPeriod);
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
  const [showOnlyWithVacancies, setShowOnlyWithVacancies] = useState(false);
  const [hoveredCommissionId, setHoveredCommissionId] = useState<string | null>(null);
  const [hoveredLinkedTeoricoId, setHoveredLinkedTeoricoId] = useState<string | null>(null);
  const [hoveredLinkedSeminarioId, setHoveredLinkedSeminarioId] = useState<string | null>(null);
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
    period: currentPeriod || period,
    careerSlug,
  });

  const resetSelectionState = useCallback(() => {
    setHoveredCommissionId(null);
    setHoveredLinkedTeoricoId(null);
    setHoveredLinkedSeminarioId(null);
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
    enrolledBySubject,
    commissionQuery,
    showOnlyWithVacancies,
    onSubjectChanged: resetSelectionState,
  });
  const savedSubjects = useMemo(
    () => subjects.filter((subject) => enrolledBySubject[subject.id]),
    [subjects, enrolledBySubject]
  );
  const selectedSubjectForCalendar = selectedSubject ?? EMPTY_SELECTED_SUBJECT;
  const conflictingSubject = useMemo(() => {
    if (!selectedSubject) return null;
    const currentMateria = materiaCodeBySubjectId[selectedSubject.id];
    if (!currentMateria) return null;
    const conflictId = Object.keys(enrolledBySubject).find(
      (subjectId) =>
        subjectId !== selectedSubject.id && materiaCodeBySubjectId[subjectId] === currentMateria
    );
    if (!conflictId) return null;
    return subjects.find((subject) => subject.id === conflictId) || null;
  }, [enrolledBySubject, materiaCodeBySubjectId, selectedSubject, subjects]);
  const conflictingCatedraLabel =
    conflictingSubject?.label.match(/Cátedra\s+\d+/i)?.[0] || 'cátedra seleccionada';
  const hasTeoricos = selectedSubject ? slotsByTipo(selectedSubject, 'teo').length > 0 : false;
  const hasSeminarios = selectedSubject ? slotsByTipo(selectedSubject, 'sem').length > 0 : false;
  const filteredComisionesVacancies = useMemo(
    () => sumKnownVacancies(filteredComisiones),
    [filteredComisiones]
  );
  const selectedSubjectVacancies = useMemo(
    () => sumKnownVacancies(selectedSubject?.comisiones || []),
    [selectedSubject]
  );

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

  useSchedulerTelemetryEffects({
    careerSlug,
    selectedSubject,
    isCommissionDropdownOpen,
    commissionQuery,
    searchedComisionesLength: searchedComisiones.length,
  });
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
  const { startTour } = useSchedulerTour({
    selectedSubjectId,
    setSelectedSubjectId,
    enrolledBySubject,
    setEnrolledBySubject,
    setIsMateriaPanelOpen,
    setIsMateriaDropdownOpen,
    setIsEleccionesPanelOpen,
    setIsMostrarPanelOpen,
    setIsSedesPanelOpen,
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
      hoveredLinkedTeoricoId,
      hoveredLinkedSeminarioId,
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
  const {
    onToggleEnrollment,
    onClearSelectedSubject,
    onToggleVenue,
    onSetOnlyVenue,
    onSetOnlyContent,
    onSelectAllVisible,
    onClearVisible,
    onToggleCommission,
  } = useSchedulerCallbacks({
    selectedSubject,
    careerSlug,
    selectedVenues,
    searchedComisiones,
    selectedCommissionIds,
    applyEnrollmentRule,
    setSelectedSubjectId,
    setEnrolledBySubject,
    toggleVenue,
    setOnlyVenue,
    setOnlyContent,
    selectAllVisible,
    clearVisible,
    toggleCommission,
  });
  const schedulerTitle = selectedSubject ? displayHeaderLabel(selectedSubject.header) : careerLabel;

  const filtersPanelProps: ComponentProps<typeof SchedulerFiltersPanel> = {
    selectedSubjectLabel: selectedSubject
      ? displaySubjectLabel(selectedSubject.label)
      : 'Buscar / Seleccionar Materia',
    selectedSubjectId: selectedSubject?.id || '',
    isMateriaPanelOpen,
    setIsMateriaPanelOpen,
    isMateriaDropdownOpen,
    setIsMateriaDropdownOpen,
    materiaDropdownRef,
    materiaInputRef,
    materiaInputValue,
    onMateriaInputChange,
    onMateriaInputKeyDown,
    onClearSelectedSubject,
    groupedSubjectOptions,
    flatSelectableSubjectsLength: flatSelectableSubjects.length,
    highlightedSubjectIndex,
    setHighlightedSubjectIndex,
    selectSubject,
    focusOptionByIndex,
    optionRefs,
    isSedesPanelOpen,
    setIsSedesPanelOpen,
    allVenues,
    selectedVenues,
    toggleVenue: onToggleVenue,
    setOnlyVenue: onSetOnlyVenue,
    isMostrarPanelOpen,
    setIsMostrarPanelOpen,
    showComisiones,
    setShowComisiones,
    hasTeoricos,
    showTeoricos,
    setShowTeoricos,
    hasSeminarios,
    showSeminarios,
    setShowSeminarios,
    showOtherSubjects,
    setShowOtherSubjects,
    setOnlyContent: onSetOnlyContent,
    isComisionesPanelOpen,
    setIsComisionesPanelOpen,
    selectedComisionesLength: selectedComisiones.length,
    filteredComisionesLength: filteredComisiones.length,
    filteredComisionesVacancies,
    selectedSubjectVacancies,
    isCommissionDropdownOpen,
    setIsCommissionDropdownOpen,
    selectAllVisible: onSelectAllVisible,
    clearVisible: onClearVisible,
    commissionQuery,
    setCommissionQuery,
    showOnlyWithVacancies,
    setShowOnlyWithVacancies,
    searchedComisiones,
    selectedCommissionIds,
    toggleCommission: onToggleCommission,
  };

  const savedElectionsPanelProps: ComponentProps<typeof SavedElectionsPanel> = {
    isOpen: isEleccionesPanelOpen,
    savedElectionDetails,
    savedConflictDetailsBySlot,
    alwaysConflictingSavedSlotIds,
    highlightedConflictSlotIds,
    onOpenPanel: () => {
      if (!isEleccionesPanelOpen) setIsEleccionesPanelOpen(true);
    },
    onToggleOpen: () => setIsEleccionesPanelOpen((v) => !v),
  };
  const calendarGridProps: ComponentProps<typeof CalendarGrid> = {
    visibleEventSlots,
    activeCommission,
    selectedSubjectId: selectedSubject?.id || '',
    enrolledBySubject,
    enrolledCurrentCommissionId,
    conflictByEventId,
    hoveredConflictEventId,
    setHoveredConflictEventId,
    hoveredCommissionId,
    setHoveredCommissionId,
    hoveredLinkedTeoricoId,
    setHoveredLinkedTeoricoId,
    hoveredLinkedSeminarioId,
    setHoveredLinkedSeminarioId,
    pinnedCommissionId,
    setPinnedCommissionId,
    setStackIndexBySlot,
    onToggleEnrollment,
  };

  return (
    <div
      className="box-border h-dvh bg-[radial-gradient(circle_at_0%_0%,#f4dde9_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#f9edf4_0%,transparent_35%),#f8f2f5] px-3 py-4 dark:bg-[radial-gradient(circle_at_0%_0%,#3a1b2c_0%,transparent_35%),radial-gradient(circle_at_100%_100%,#231725_0%,transparent_35%),#0f0b12] md:px-5"
      data-tour="scheduler-root"
      data-testid="scheduler-root"
    >
      <section className="mx-auto flex h-full w-full max-w-[1800px] min-h-0 flex-col gap-2">
        <SchedulerHeader
          title={schedulerTitle}
          careerSlug={careerSlug}
          period={period}
          onStartTour={() => startTour(true)}
        />
        <MobileDesktopWarning />

        <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-2">
          <SchedulerCalendarSection
            showConflictWarning={Boolean(conflictingSubject && !dismissConflictWarning)}
            conflictCatedraLabel={conflictingCatedraLabel}
            onDismissConflictWarning={() => setDismissConflictWarning(true)}
            calendarGridProps={calendarGridProps}
          />

          <SchedulerRightPanel
            isEleccionesPanelOpen={isEleccionesPanelOpen}
            filtersPanelProps={filtersPanelProps}
            savedElectionsPanelProps={savedElectionsPanelProps}
          />
        </div>
      </section>
    </div>
  );
};

export const Scheduler = (props: SchedulerProps) => {
  const {
    subjects,
    careerLabel = 'Lic. Psicología UBA',
    careerSlug = 'lic-psicologia',
    period,
  } = props;
  const bootstrapOffer = useAppStore((state) => state.bootstrapOffer);
  const storeSubjects = useAppStore((state) => state.subjects);
  const storeCareerSlug = useAppStore((state) => state.currentCareerSlug);
  const storePeriod = useAppStore((state) => state.currentPeriod);

  useEffect(() => {
    bootstrapOffer({
      period,
      careerSlug,
      careerLabel,
      subjects,
    });
  }, [bootstrapOffer, careerLabel, careerSlug, period, subjects]);

  const effectiveSubjects =
    storeCareerSlug === careerSlug && storePeriod === period && storeSubjects.length
      ? storeSubjects
      : subjects;
  if (!effectiveSubjects.length) return <EmptySubjectsState />;

  return (
    <SchedulerContent
      subjects={effectiveSubjects}
      careerLabel={careerLabel}
      careerSlug={careerSlug}
      period={period}
    />
  );
};
