import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SchedulerFiltersPanel } from './index';
import type { SubjectData } from '../../psicologia-scheduler.types';

const subjectOption: SubjectData = {
  id: '35',
  label: '(2) Psicología Social - Cátedra 35 (I)',
  header: 'Psicología UBA - I - Vodovotz',
  teoricos: [],
  seminarios: [],
  comisiones: [],
};

const createProps = (overrides: Partial<Parameters<typeof SchedulerFiltersPanel>[0]> = {}) => ({
  selectedSubjectLabel: subjectOption.label,
  selectedSubjectId: subjectOption.id,
  isMateriaPanelOpen: false,
  setIsMateriaPanelOpen: vi.fn(),
  isMateriaDropdownOpen: false,
  setIsMateriaDropdownOpen: vi.fn(),
  materiaDropdownRef: { current: null },
  materiaInputRef: { current: null },
  materiaInputValue: subjectOption.label,
  onMateriaInputChange: vi.fn(),
  onMateriaInputKeyDown: vi.fn(),
  onClearSelectedSubject: vi.fn(),
  groupedSubjectOptions: [{ groupLabel: '(2) Psicología Social', options: [subjectOption] }],
  flatSelectableSubjectsLength: 1,
  highlightedSubjectIndex: 0,
  setHighlightedSubjectIndex: vi.fn(),
  selectSubject: vi.fn(),
  focusOptionByIndex: vi.fn(),
  optionRefs: { current: {} },
  isSedesPanelOpen: false,
  setIsSedesPanelOpen: vi.fn(),
  allVenues: ['IN', 'HY', 'SI'] as const,
  selectedVenues: new Set(['IN', 'SI']),
  toggleVenue: vi.fn(),
  setOnlyVenue: vi.fn(),
  isMostrarPanelOpen: false,
  setIsMostrarPanelOpen: vi.fn(),
  showComisiones: true,
  setShowComisiones: vi.fn(),
  hasTeoricos: true,
  showTeoricos: false,
  setShowTeoricos: vi.fn(),
  hasSeminarios: true,
  showSeminarios: false,
  setShowSeminarios: vi.fn(),
  showOtherSubjects: true,
  setShowOtherSubjects: vi.fn(),
  setOnlyContent: vi.fn(),
  isComisionesPanelOpen: true,
  setIsComisionesPanelOpen: vi.fn(),
  selectedComisionesLength: 1,
  filteredComisionesLength: 2,
  isCommissionDropdownOpen: true,
  setIsCommissionDropdownOpen: vi.fn(),
  selectAllVisible: vi.fn(),
  clearVisible: vi.fn(),
  commissionQuery: '',
  setCommissionQuery: vi.fn(),
  searchedComisiones: [
    {
      id: '1',
      dia: 'lunes',
      inicio: '09:00',
      fin: '10:30',
      profesor: 'Comision Uno',
      oblig: 'I - A',
      teoricoId: 'I',
      seminarioId: 'A',
      aula: 'IN-101',
      observ: '',
    },
  ],
  selectedCommissionIds: new Set(['1']),
  toggleCommission: vi.fn(),
  ...overrides,
});

describe('SchedulerFiltersPanel', () => {
  it('en modo sedes colapsado permite toggle y set-only por doble click', () => {
    const toggleVenue = vi.fn();
    const setOnlyVenue = vi.fn();
    render(<SchedulerFiltersPanel {...createProps({ toggleVenue, setOnlyVenue })} />);

    fireEvent.click(screen.getByRole('button', { name: 'IN' }));
    fireEvent.doubleClick(screen.getByRole('button', { name: 'HY' }));

    expect(toggleVenue).toHaveBeenCalledWith('IN');
    expect(setOnlyVenue).toHaveBeenCalledWith('HY');
  });

  it('en tipo colapsado permite toggle y set-only por doble click', () => {
    const setShowTeoricos = vi.fn();
    const setOnlyContent = vi.fn();
    render(<SchedulerFiltersPanel {...createProps({ setShowTeoricos, setOnlyContent })} />);

    fireEvent.click(screen.getByTitle('Teóricos'));
    fireEvent.doubleClick(screen.getByTitle('Seminarios'));

    expect(setShowTeoricos).toHaveBeenCalled();
    expect(setOnlyContent).toHaveBeenCalledWith('seminarios');
  });

  it('en dropdown de comisiones usa acciones de seleccionar, limpiar, query y checkbox', () => {
    const selectAllVisible = vi.fn();
    const clearVisible = vi.fn();
    const setCommissionQuery = vi.fn();
    const toggleCommission = vi.fn();
    render(
      <SchedulerFiltersPanel
        {...createProps({
          selectAllVisible,
          clearVisible,
          setCommissionQuery,
          toggleCommission,
        })}
      />
    );

    fireEvent.click(screen.getByLabelText('Seleccionar todo'));
    fireEvent.click(screen.getByLabelText('Limpiar'));
    fireEvent.change(screen.getByPlaceholderText('profe o día'), { target: { value: 'lunes' } });
    fireEvent.click(screen.getByRole('checkbox'));

    expect(selectAllVisible).toHaveBeenCalledTimes(1);
    expect(clearVisible).toHaveBeenCalledTimes(1);
    expect(setCommissionQuery).toHaveBeenCalled();
    expect(toggleCommission).toHaveBeenCalledWith('1');
  });

  it('oculta controles de Teóricos/Seminarios cuando la cátedra no los tiene', () => {
    render(
      <SchedulerFiltersPanel
        {...createProps({
          hasTeoricos: false,
          hasSeminarios: false,
        })}
      />
    );

    expect(screen.queryByTitle('Teóricos')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Seminarios')).not.toBeInTheDocument();
  });

  it('permite limpiar la materia seleccionada desde el panel de materia', () => {
    const onClearSelectedSubject = vi.fn();
    render(
      <SchedulerFiltersPanel
        {...createProps({
          isMateriaPanelOpen: true,
          onClearSelectedSubject,
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar materia seleccionada' }));
    expect(onClearSelectedSubject).toHaveBeenCalledTimes(1);
  });

  it('oculta "Otras materias" cuando no hay materia/cátedra seleccionada', () => {
    render(
      <SchedulerFiltersPanel
        {...createProps({
          selectedSubjectId: '',
          isMostrarPanelOpen: true,
        })}
      />
    );

    expect(screen.queryByTitle('Mostrar/Ocultar elecciones de otras materias')).not.toBeInTheDocument();
    expect(screen.queryByText('Otras materias')).not.toBeInTheDocument();
  });
});
