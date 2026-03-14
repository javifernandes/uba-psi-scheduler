import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SchedulerFiltersPanel } from './index';
import type { Comision, SubjectData } from '../../scheduler.types';
import { setSchedulerTourStep } from '@/hooks/dom/use-scheduler-tour-step';

const subjectOption: SubjectData = {
  schemaVersion: 2,
  id: '35',
  label: '(2) Psicología Social - Cátedra 35 (I)',
  header: 'Psicología UBA - I - Vodovotz',
  slots: [],
};

const searchedComisiones: Comision[] = [
  {
    tipo: 'prac',
    id: '1',
    dia: 'lunes',
    inicio: '09:00',
    fin: '10:30',
    profesor: 'Comision Uno',
    slotsAsociados: [
      { slotId: 'A', rol: 'sem', condicion: 'obligatorio' },
      { slotId: 'I', rol: 'teo', condicion: 'obligatorio' },
    ],
    lugar: {
      anexo: 'IN',
      aula: '101',
    },
    vacantes: 12,
  },
];

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
  showOnlyWithVacancies: false,
  setShowOnlyWithVacancies: vi.fn(),
  searchedComisiones,
  selectedCommissionIds: new Set(['1']),
  toggleCommission: vi.fn(),
  ...overrides,
});

describe('SchedulerFiltersPanel', () => {
  afterEach(() => {
    delete document.body.dataset.schedulerTourStep;
  });

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
    fireEvent.change(screen.getByPlaceholderText('Profesor o día'), { target: { value: 'lunes' } });
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[checkboxes.length - 1]!);

    expect(selectAllVisible).toHaveBeenCalledTimes(1);
    expect(clearVisible).toHaveBeenCalledTimes(1);
    expect(setCommissionQuery).toHaveBeenCalled();
    expect(toggleCommission).toHaveBeenCalledWith('1');
  });

  it('permite activar el filtro de solo vacantes desde el dropdown de comisiones', () => {
    const setShowOnlyWithVacancies = vi.fn();
    render(
      <SchedulerFiltersPanel
        {...createProps({
          setShowOnlyWithVacancies,
        })}
      />
    );

    fireEvent.click(screen.getByLabelText('Solo con vacantes'));
    expect(setShowOnlyWithVacancies).toHaveBeenCalled();
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

  it('al enfocar materia limpia el texto seleccionado y muestra placeholder con ESC', () => {
    const onMateriaInputChange = vi.fn();
    render(
      <SchedulerFiltersPanel
        {...createProps({
          isMateriaPanelOpen: true,
          onMateriaInputChange,
        })}
      />
    );

    const input = screen.getByPlaceholderText('Buscar / Seleccionar Materia (ESC para cancelar)');
    fireEvent.focus(input);

    expect(onMateriaInputChange).toHaveBeenCalledWith('');
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

    expect(
      screen.queryByTitle('Mostrar/Ocultar elecciones de otras materias')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Otras materias')).not.toBeInTheDocument();
  });

  it('cuando el dropdown de materia está abierto eleva el panel para superponerse a los demás', () => {
    const { container } = render(
      <SchedulerFiltersPanel
        {...createProps({
          isMateriaPanelOpen: true,
          isMateriaDropdownOpen: true,
        })}
      />
    );

    const panel = screen.getByTestId('subject-panel');
    const dropdown = screen.getByTestId('subject-dropdown');
    expect(panel.className).toContain('z-40');
    expect(dropdown.className).toContain('z-50');
    expect(container).toContainElement(dropdown);
  });

  it('durante paso select-subject del tour mantiene visible el dropdown aunque estado local esté cerrado', async () => {
    const { queryByTestId } = render(
      <SchedulerFiltersPanel
        {...createProps({
          isMateriaPanelOpen: true,
          isMateriaDropdownOpen: false,
        })}
      />
    );

    expect(queryByTestId('subject-dropdown')).not.toBeInTheDocument();

    act(() => {
      setSchedulerTourStep('select-subject');
    });

    await waitFor(() => {
      expect(screen.getByTestId('subject-dropdown')).toBeInTheDocument();
    });

    act(() => {
      setSchedulerTourStep(null);
    });
  });
});
