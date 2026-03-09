'use client';

import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  MutableRefObject,
  SetStateAction,
} from 'react';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSchedulerTourStep } from '@/hooks/dom/use-scheduler-tour-step';
import type { Comision, SubjectData, VenueCode } from '../../scheduler.types';
import {
  catedraFragmentFromLabel,
  catedraProfessorFromHeader,
  commissionSummaryLabel,
  venueBadgeCode,
  venueLabel,
} from '../../scheduler.utils';
import { collapsedComisionesSummary, collapsedMateriaSummary } from './summaries';

type SubjectGroup = {
  groupLabel: string;
  options: SubjectData[];
};

type SchedulerFiltersPanelProps = {
  selectedSubjectLabel: string;
  selectedSubjectId: string;
  isMateriaPanelOpen: boolean;
  setIsMateriaPanelOpen: Dispatch<SetStateAction<boolean>>;
  isMateriaDropdownOpen: boolean;
  setIsMateriaDropdownOpen: Dispatch<SetStateAction<boolean>>;
  materiaDropdownRef: MutableRefObject<HTMLDivElement | null>;
  materiaInputRef: MutableRefObject<HTMLInputElement | null>;
  materiaInputValue: string;
  onMateriaInputChange: (value: string) => void;
  onMateriaInputKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onClearSelectedSubject: () => void;
  groupedSubjectOptions: SubjectGroup[];
  flatSelectableSubjectsLength: number;
  highlightedSubjectIndex: number;
  setHighlightedSubjectIndex: Dispatch<SetStateAction<number>>;
  selectSubject: (subjectId: string) => void;
  focusOptionByIndex: (index: number) => void;
  optionRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  isSedesPanelOpen: boolean;
  setIsSedesPanelOpen: Dispatch<SetStateAction<boolean>>;
  allVenues: VenueCode[];
  selectedVenues: Set<VenueCode>;
  toggleVenue: (venue: VenueCode) => void;
  setOnlyVenue: (venue: VenueCode) => void;
  isMostrarPanelOpen: boolean;
  setIsMostrarPanelOpen: Dispatch<SetStateAction<boolean>>;
  showComisiones: boolean;
  setShowComisiones: Dispatch<SetStateAction<boolean>>;
  hasTeoricos: boolean;
  showTeoricos: boolean;
  setShowTeoricos: Dispatch<SetStateAction<boolean>>;
  hasSeminarios: boolean;
  showSeminarios: boolean;
  setShowSeminarios: Dispatch<SetStateAction<boolean>>;
  showOtherSubjects: boolean;
  setShowOtherSubjects: Dispatch<SetStateAction<boolean>>;
  setOnlyContent: (type: 'comisiones' | 'teoricos' | 'seminarios' | 'otras') => void;
  isComisionesPanelOpen: boolean;
  setIsComisionesPanelOpen: Dispatch<SetStateAction<boolean>>;
  selectedComisionesLength: number;
  filteredComisionesLength: number;
  isCommissionDropdownOpen: boolean;
  setIsCommissionDropdownOpen: Dispatch<SetStateAction<boolean>>;
  selectAllVisible: () => void;
  clearVisible: () => void;
  commissionQuery: string;
  setCommissionQuery: Dispatch<SetStateAction<string>>;
  searchedComisiones: Comision[];
  selectedCommissionIds: Set<string>;
  toggleCommission: (id: string) => void;
};

export const SchedulerFiltersPanel = ({
  selectedSubjectLabel,
  selectedSubjectId,
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
  flatSelectableSubjectsLength,
  highlightedSubjectIndex,
  setHighlightedSubjectIndex,
  selectSubject,
  focusOptionByIndex,
  optionRefs,
  isSedesPanelOpen,
  setIsSedesPanelOpen,
  allVenues,
  selectedVenues,
  toggleVenue,
  setOnlyVenue,
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
  setOnlyContent,
  isComisionesPanelOpen,
  setIsComisionesPanelOpen,
  selectedComisionesLength,
  filteredComisionesLength,
  isCommissionDropdownOpen,
  setIsCommissionDropdownOpen,
  selectAllVisible,
  clearVisible,
  commissionQuery,
  setCommissionQuery,
  searchedComisiones,
  selectedCommissionIds,
  toggleCommission,
}: SchedulerFiltersPanelProps) => {
  const canToggleOtherSubjects = Boolean(selectedSubjectId);
  const { tourStepId } = useSchedulerTourStep();
  const materiaOptionsRef = useRef<HTMLDivElement | null>(null);
  const [showMateriaScrollHint, setShowMateriaScrollHint] = useState(false);
  const isTourSelectingSubject = tourStepId === 'select-subject';
  const isMateriaDropdownVisible = isMateriaDropdownOpen || isTourSelectingSubject;

  useEffect(() => {
    if (!isMateriaDropdownVisible) {
      setShowMateriaScrollHint(false);
      return;
    }
    const node = materiaOptionsRef.current;
    if (!node) return;
    const updateHint = () => {
      const hasMoreBelow = node.scrollTop + node.clientHeight < node.scrollHeight - 4;
      setShowMateriaScrollHint(hasMoreBelow);
    };
    updateHint();
    node.addEventListener('scroll', updateHint, { passive: true });
    window.addEventListener('resize', updateHint);
    return () => {
      node.removeEventListener('scroll', updateHint);
      window.removeEventListener('resize', updateHint);
    };
  }, [isMateriaDropdownVisible, groupedSubjectOptions]);

  useEffect(() => {
    if (!isTourSelectingSubject) return;
    const node = materiaOptionsRef.current;
    if (!node) return;
    node.scrollTop = 0;
  }, [isTourSelectingSubject, groupedSubjectOptions]);

  return (
    <>
      <article
        onClick={() => {
          if (!isMateriaPanelOpen) setIsMateriaPanelOpen(true);
        }}
        className={cn(
          'order-1 relative rounded-xl border border-[#ead9e2] bg-white px-3 pt-3 dark:border-zinc-700 dark:bg-zinc-900',
          isMateriaDropdownVisible && 'z-40',
          !isMateriaPanelOpen && 'cursor-pointer',
          isMateriaPanelOpen ? 'pb-3' : 'pb-1.5'
        )}
        data-tour="subject-panel"
        data-testid="subject-panel"
      >
        <div
          className="mb-2 flex cursor-pointer items-center justify-between"
          onClick={() => setIsMateriaPanelOpen(v => !v)}
        >
          <h2 className="text-sm font-semibold text-[#6d5162] dark:text-zinc-200">
            Materia / Cátedra
          </h2>
          <div className="flex items-center gap-2">
            {!isMateriaPanelOpen ? (
              <span className="text-[11px] text-[#9f8695] dark:text-zinc-400">
                {collapsedMateriaSummary(selectedSubjectLabel)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsMateriaPanelOpen(v => !v);
              }}
              className="text-[#9f8695] hover:text-[#6d5162] dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="Expandir o colapsar Materia"
            >
              {isMateriaPanelOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>
        {isMateriaPanelOpen ? (
          <div className="relative" ref={materiaDropdownRef}>
            <input
              ref={materiaInputRef}
              type="text"
              value={materiaInputValue}
              onChange={e => onMateriaInputChange(e.target.value)}
              onFocus={e => {
                setIsMateriaDropdownOpen(true);
                if (selectedSubjectId && materiaInputValue.trim().length > 0) {
                  onMateriaInputChange('');
                }
              }}
              onClick={e => {
                setIsMateriaDropdownOpen(true);
                if (selectedSubjectId && materiaInputValue.trim().length > 0) {
                  onMateriaInputChange('');
                }
              }}
              onKeyDown={onMateriaInputKeyDown}
              placeholder="Buscar / Seleccionar Materia (ESC para cancelar)"
              className="h-9 w-full rounded-lg border border-[#d7b8c9] bg-[#fff8fc] px-3 text-sm font-medium text-[#5a1740] placeholder:text-[#a68498] focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
              data-tour="subject-input"
              data-testid="subject-input"
            />
            {selectedSubjectId ? (
              <div className="mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onClearSelectedSubject();
                  }}
                  className="rounded px-1.5 py-0.5 text-[11px] font-medium text-[#8a6a7d] hover:bg-[#f4e8ef] hover:text-[#5a1740] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                  aria-label="Limpiar materia seleccionada"
                  data-tour="clear-selected-subject"
                  data-testid="clear-selected-subject"
                >
                  Limpiar selección
                </button>
              </div>
            ) : null}
            {isMateriaDropdownVisible ? (
              <div
                className={cn(
                  'z-50 mt-1 rounded-lg border border-[#ead9e2] bg-[#fffafe] p-2 shadow-md dark:border-zinc-700 dark:bg-zinc-900',
                  'absolute left-0 right-0 top-full'
                )}
                data-tour="subject-dropdown"
                data-testid="subject-dropdown"
              >
                <div
                  ref={materiaOptionsRef}
                  className="max-h-[30rem] divide-y divide-[#f0e5ec] overflow-auto bg-white dark:divide-zinc-700 dark:bg-zinc-800"
                >
                  {(() => {
                    let optionIndex = -1;
                    return groupedSubjectOptions.map(group => (
                      <div
                        key={group.groupLabel}
                        className="border-b border-[#f0e5ec] last:border-b-0 dark:border-zinc-700"
                      >
                        <div className="px-5 pb-1.5 pt-2 text-[14px] font-bold text-[#4f1237] dark:text-zinc-100">
                          {group.groupLabel}
                        </div>
                        <div className="divide-y divide-[#f5ebf1] dark:divide-zinc-700/70">
                          {group.options.map(subject => {
                            optionIndex += 1;
                            const isHighlighted = optionIndex === highlightedSubjectIndex;
                            return (
                              <button
                                key={subject.id}
                                ref={node => {
                                  optionRefs.current[subject.id] = node;
                                }}
                                type="button"
                                onMouseEnter={() => setHighlightedSubjectIndex(optionIndex)}
                                onClick={() => selectSubject(subject.id)}
                                onKeyDown={event => {
                                  if (event.key === 'ArrowDown') {
                                    event.preventDefault();
                                    focusOptionByIndex(optionIndex + 1);
                                    return;
                                  }
                                  if (event.key === 'ArrowUp') {
                                    event.preventDefault();
                                    focusOptionByIndex(optionIndex - 1);
                                    return;
                                  }
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    selectSubject(subject.id);
                                    return;
                                  }
                                  if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setIsMateriaDropdownOpen(false);
                                    materiaInputRef.current?.focus();
                                  }
                                }}
                                className={cn(
                                  'w-full px-5 py-3 text-left hover:bg-[#fdf4f8] dark:hover:bg-zinc-700/60',
                                  (selectedSubjectId === subject.id || isHighlighted) &&
                                    'bg-[#f8eaf1] ring-1 ring-inset ring-[#e4cad7] dark:bg-zinc-700 dark:ring-zinc-600'
                                )}
                                data-tour="subject-option"
                                data-testid="subject-option"
                                data-subject-id={subject.id}
                              >
                                <div className="pl-4 text-[12px] font-semibold text-[#6d5162] dark:text-zinc-300">
                                  {catedraFragmentFromLabel(subject.label)} ·{' '}
                                  <span className="font-medium text-[#8b6f80] dark:text-zinc-400">
                                    {catedraProfessorFromHeader(subject.header)}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ));
                  })()}
                  {!flatSelectableSubjectsLength ? (
                    <div className="px-2 py-1 text-[11px] text-[#7c6272] dark:text-zinc-400">
                      Sin resultados.
                    </div>
                  ) : null}
                </div>
                {showMateriaScrollHint ? (
                  <div className="pt-1 text-center text-[10px] font-medium text-[#9f8695] dark:text-zinc-400">
                    ↓ Hay más opciones abajo
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </article>
      <article
        onClick={() => {
          if (!isComisionesPanelOpen) setIsComisionesPanelOpen(true);
        }}
        className={cn(
          'order-2 rounded-xl border border-[#ead9e2] bg-white px-3 pt-3 dark:border-zinc-700 dark:bg-zinc-900',
          !isComisionesPanelOpen && 'cursor-pointer',
          isComisionesPanelOpen ? 'pb-3' : 'pb-1.5'
        )}
      >
        <div
          className="mb-2 flex cursor-pointer items-center justify-between"
          onClick={() => setIsComisionesPanelOpen(v => !v)}
        >
          <h2 className="text-sm font-semibold text-[#6d5162] dark:text-zinc-200">Comisiones</h2>
          <div className="flex items-center gap-2">
            {!isComisionesPanelOpen ? (
              <span className="text-[11px] text-[#9f8695] dark:text-zinc-400">
                {collapsedComisionesSummary(selectedComisionesLength, filteredComisionesLength)}
              </span>
            ) : null}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsComisionesPanelOpen(v => !v);
              }}
              className="text-[#9f8695] hover:text-[#6d5162] dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="Expandir o colapsar Comisiones"
            >
              {isComisionesPanelOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>
        {isComisionesPanelOpen ? (
          <>
            <button
              type="button"
              onClick={() => setIsCommissionDropdownOpen(v => !v)}
              className="w-full rounded-lg border border-[#d7b8c9] bg-[#fff8fc] px-3 py-2 text-left text-sm font-medium text-[#5a1740] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            >
              Comisiones ({selectedComisionesLength}/{filteredComisionesLength})
            </button>
            {isCommissionDropdownOpen ? (
              <div className="mt-2 space-y-2 rounded-lg border border-[#ead9e2] bg-[#fffafe] p-2 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Seleccionar todo"
                    aria-label="Seleccionar todo"
                    onClick={selectAllVisible}
                    className="rounded border border-[#d7b8c9] bg-white px-2 py-1 text-xs font-semibold text-[#5a1740] hover:bg-[#fdf1f7] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    title="Limpiar"
                    aria-label="Limpiar"
                    onClick={clearVisible}
                    className="rounded border border-[#d7b8c9] bg-white px-2 py-1 text-xs font-semibold text-[#5a1740] hover:bg-[#fdf1f7] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                  >
                    ✕
                  </button>
                  <input
                    type="text"
                    value={commissionQuery}
                    onChange={e => setCommissionQuery(e.target.value)}
                    placeholder="Profesor o día"
                    className="ml-1 h-7 min-w-0 flex-1 rounded border border-[#d7b8c9] bg-white px-2 text-[11px] text-[#5a1740] placeholder:text-[#a68498] focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                  />
                </div>
                <div className="max-h-56 space-y-1 overflow-auto rounded border border-[#f0e5ec] bg-white p-2 dark:border-zinc-700 dark:bg-zinc-800">
                  {searchedComisiones.map(c => {
                    const checked = selectedCommissionIds.has(c.id);
                    return (
                      <label
                        key={c.id}
                        className={cn(
                          'flex cursor-pointer items-start gap-2 rounded p-1 text-xs text-[#4f1237] dark:text-zinc-100',
                          checked
                            ? 'bg-[#f8eaf1] dark:bg-zinc-700'
                            : 'hover:bg-[#fdf4f8] dark:hover:bg-zinc-700/60'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCommission(c.id)}
                          className="mt-0.5 h-4 w-4 accent-[#861f5c]"
                        />
                        <span>{commissionSummaryLabel(c)}</span>
                      </label>
                    );
                  })}
                </div>
                {!searchedComisiones.length ? (
                  <div className="text-[11px] text-[#7c6272] dark:text-zinc-400">
                    No hay comisiones prácticas para las sedes/filtro actuales.
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </article>

      <article
        onClick={() => {
          if (!isSedesPanelOpen) setIsSedesPanelOpen(true);
        }}
        className={cn(
          'order-3 rounded-xl border border-[#ead9e2] bg-white px-3 pt-3 dark:border-zinc-700 dark:bg-zinc-900',
          !isSedesPanelOpen && 'cursor-pointer',
          isSedesPanelOpen ? 'pb-3' : 'pb-1.5'
        )}
        data-tour="venue-filters-panel"
        data-testid="venue-filters-panel"
      >
        <div
          className="mb-2 flex cursor-pointer items-center justify-between"
          onClick={() => setIsSedesPanelOpen(v => !v)}
        >
          <h2 className="text-sm font-semibold text-[#6d5162] dark:text-zinc-200">Sedes</h2>
          <div className="flex items-center gap-2">
            {!isSedesPanelOpen ? (
              <span className="flex items-center gap-2">
                {allVenues.map(venue => {
                  const active = selectedVenues.has(venue);
                  return (
                    <button
                      key={`venue-inline-${venue}`}
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        toggleVenue(venue);
                      }}
                      onDoubleClick={e => {
                        e.stopPropagation();
                        setOnlyVenue(venue);
                      }}
                      title={venueLabel(venue)}
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-semibold transition',
                        active
                          ? 'bg-[#861f5c]/15 text-[#5a1740] opacity-100 dark:text-zinc-100'
                          : 'bg-zinc-200/70 text-zinc-500 opacity-60 hover:opacity-90 dark:bg-zinc-700 dark:text-zinc-400'
                      )}
                    >
                      {venueBadgeCode(venue)}
                    </button>
                  );
                })}
              </span>
            ) : null}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsSedesPanelOpen(v => !v);
              }}
              className="text-[#9f8695] hover:text-[#6d5162] dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="Expandir o colapsar Sedes"
            >
              {isSedesPanelOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>
        {isSedesPanelOpen ? (
          <div className="space-y-2 pl-1.5">
            {allVenues.map(venue => (
              <label
                key={venue}
                className="flex cursor-pointer items-center gap-3 text-sm text-[#4f1237] dark:text-zinc-200"
              >
                <input
                  type="checkbox"
                  checked={selectedVenues.has(venue)}
                  onChange={() => toggleVenue(venue)}
                  className="h-4 w-4 accent-[#861f5c]"
                />
                <span className="inline-flex items-center">
                  <span className="inline-block min-w-[2.25rem] text-left font-semibold tabular-nums">
                    {venueBadgeCode(venue)}
                  </span>
                  <span className="inline-block w-3 text-center leading-none">·</span>
                  <span className="break-words">{venueLabel(venue)}</span>
                </span>
              </label>
            ))}
          </div>
        ) : null}
      </article>

      <article
        onClick={() => {
          if (!isMostrarPanelOpen) setIsMostrarPanelOpen(true);
        }}
        className={cn(
          'order-4 rounded-xl border border-[#ead9e2] bg-white px-3 pt-3 dark:border-zinc-700 dark:bg-zinc-900',
          !isMostrarPanelOpen && 'cursor-pointer',
          isMostrarPanelOpen ? 'pb-3' : 'pb-1.5'
        )}
        data-tour="content-filters-panel"
        data-testid="content-filters-panel"
      >
        <div
          className="mb-2 flex cursor-pointer items-center justify-between"
          onClick={() => setIsMostrarPanelOpen(v => !v)}
        >
          <h2 className="text-sm font-semibold text-[#6d5162] dark:text-zinc-200">
            Tipo de contenido
          </h2>
          <div className="flex items-center gap-2">
            {!isMostrarPanelOpen ? (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setShowComisiones(v => !v);
                  }}
                  onDoubleClick={e => {
                    e.stopPropagation();
                    setOnlyContent('comisiones');
                  }}
                  title="Comisiones"
                  className={cn(
                    'h-2.5 w-2.5 rounded-full transition',
                    showComisiones
                      ? 'bg-[#861f5c] opacity-100'
                      : 'bg-zinc-400 opacity-45 hover:bg-[#861f5c]/65 hover:opacity-90 dark:bg-zinc-600'
                  )}
                />
                {hasTeoricos ? (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setShowTeoricos(v => !v);
                    }}
                    onDoubleClick={e => {
                      e.stopPropagation();
                      setOnlyContent('teoricos');
                    }}
                    title="Teóricos"
                    className={cn(
                      'h-2.5 w-2.5 rounded-full transition',
                      showTeoricos
                        ? 'bg-[#0f766e] opacity-100'
                        : 'bg-zinc-400 opacity-45 hover:bg-[#0f766e]/65 hover:opacity-90 dark:bg-zinc-600'
                    )}
                  />
                ) : null}
                {hasSeminarios ? (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setShowSeminarios(v => !v);
                    }}
                    onDoubleClick={e => {
                      e.stopPropagation();
                      setOnlyContent('seminarios');
                    }}
                    title="Seminarios"
                    className={cn(
                      'h-2.5 w-2.5 rounded-full transition',
                      showSeminarios
                        ? 'bg-[#d97706] opacity-100'
                        : 'bg-zinc-400 opacity-45 hover:bg-[#d97706]/65 hover:opacity-90 dark:bg-zinc-600'
                    )}
                  />
                ) : null}
                {canToggleOtherSubjects ? (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setShowOtherSubjects(v => !v);
                    }}
                    onDoubleClick={e => {
                      e.stopPropagation();
                      setOnlyContent('otras');
                    }}
                    title="Otras materias"
                    className={cn(
                      'h-2.5 w-2.5 rounded-full transition',
                      showOtherSubjects
                        ? 'bg-zinc-600 opacity-100 dark:bg-zinc-300'
                        : 'bg-zinc-400 opacity-45 hover:bg-zinc-500 hover:opacity-90 dark:bg-zinc-600'
                    )}
                  />
                ) : null}
              </span>
            ) : null}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setIsMostrarPanelOpen(v => !v);
              }}
              className="text-[#9f8695] hover:text-[#6d5162] dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-label="Expandir o colapsar Tipo de contenido"
            >
              {isMostrarPanelOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>
        </div>
        {isMostrarPanelOpen ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1 pl-1.5">
            <button
              type="button"
              onClick={() => setShowComisiones(v => !v)}
              className="inline-flex items-center gap-2 rounded px-1.5 py-0.5 text-sm text-[#4f1237] dark:text-zinc-200"
              title="Mostrar/Ocultar comisiones"
              data-tour="content-toggle-comisiones"
            >
              <span
                className={cn(
                  'h-2.5 w-2.5 rounded-full',
                  showComisiones ? 'bg-[#861f5c]' : 'bg-zinc-400 dark:bg-zinc-500'
                )}
              />
              Comisiones
            </button>
            {hasTeoricos ? (
              <button
                type="button"
                onClick={() => setShowTeoricos(v => !v)}
                className="inline-flex items-center gap-2 rounded px-1.5 py-0.5 text-sm text-[#4f1237] dark:text-zinc-200"
                title="Mostrar/Ocultar teóricos"
                data-tour="content-toggle-teoricos"
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    showTeoricos ? 'bg-[#0f766e]' : 'bg-zinc-400 dark:bg-zinc-500'
                  )}
                />
                Teóricos
              </button>
            ) : null}
            {hasSeminarios ? (
              <button
                type="button"
                onClick={() => setShowSeminarios(v => !v)}
                className="inline-flex items-center gap-2 rounded px-1.5 py-0.5 text-sm text-[#4f1237] dark:text-zinc-200"
                title="Mostrar/Ocultar seminarios"
                data-tour="content-toggle-seminarios"
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    showSeminarios ? 'bg-[#d97706]' : 'bg-zinc-400 dark:bg-zinc-500'
                  )}
                />
                Seminarios
              </button>
            ) : null}
            {canToggleOtherSubjects ? (
              <button
                type="button"
                onClick={() => setShowOtherSubjects(v => !v)}
                className="inline-flex items-center gap-2 rounded px-1.5 py-0.5 text-sm text-[#4f1237] dark:text-zinc-200"
                title="Mostrar/Ocultar elecciones de otras materias"
                data-tour="content-toggle-other-subjects"
                data-testid="content-toggle-other-subjects"
              >
                <span
                  className={cn(
                    'h-2.5 w-2.5 rounded-full',
                    showOtherSubjects
                      ? 'bg-zinc-600 dark:bg-zinc-300'
                      : 'bg-zinc-400/60 dark:bg-zinc-600'
                  )}
                />
                Otras materias
              </button>
            ) : null}
          </div>
        ) : null}
      </article>
    </>
  );
};
