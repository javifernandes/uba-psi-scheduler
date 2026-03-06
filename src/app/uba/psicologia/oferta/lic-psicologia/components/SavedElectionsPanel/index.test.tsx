import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SavedElectionsPanel } from './index';
import type { SavedElectionDetail, SubjectData } from '../../psicologia-scheduler.types';

const subject: SubjectData = {
  id: '34',
  label: '(1) Historia de la Psicología - Cátedra 34 (II)',
  header: 'header',
  teoricos: [],
  seminarios: [],
  comisiones: [],
};

const savedDetail: SavedElectionDetail = {
  subject,
  commission: {
    id: '21',
    dia: 'jueves',
    inicio: '14:30',
    fin: '16:00',
    profesor: 'Cazes Marcela Adriana',
    oblig: 'II - C',
    teoricoId: 'II',
    seminarioId: 'C',
    aula: 'IN-444',
    observ: '',
  },
  teorico: {
    id: 'II',
    dia: 'jueves',
    inicio: '12:45',
    fin: '14:15',
    profesor: 'Ibarra Maria Florencia',
    aula: 'IN-201',
    observ: '',
  },
  seminario: {
    id: 'C',
    dia: 'miercoles',
    inicio: '14:30',
    fin: '16:00',
    profesor: 'Rodriguez Sturla Pablo',
    aula: 'HY-005',
    observ: '',
  },
};

const createProps = (overrides: Partial<Parameters<typeof SavedElectionsPanel>[0]> = {}) => ({
  isOpen: true,
  savedSubjectsCount: 1,
  savedElectionDetails: [savedDetail],
  savedConflictDetailsBySlot: {},
  alwaysConflictingSavedSlotIds: new Set<string>(),
  highlightedConflictSlotIds: new Set<string>(),
  onOpenPanel: vi.fn(),
  onToggleOpen: vi.fn(),
  onRemoveSubject: vi.fn(),
  onRemoveAllSubjects: vi.fn(),
  ...overrides,
});

describe('SavedElectionsPanel', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('muestra estado vacío cuando está abierto sin elecciones', () => {
    render(<SavedElectionsPanel {...createProps({ savedElectionDetails: [] })} />);
    expect(screen.getByText('Sin elecciones guardadas.')).toBeInTheDocument();
  });

  it('en colapsado muestra contador y ejecuta onOpenPanel al clickear el contenedor', () => {
    const onOpenPanel = vi.fn();
    render(
      <SavedElectionsPanel
        {...createProps({
          isOpen: false,
          savedSubjectsCount: 3,
          onOpenPanel,
        })}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Mis elecciones'));
    expect(onOpenPanel).toHaveBeenCalled();
  });

  it('renderiza elección y permite quitar materia', () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    const onRemoveSubject = vi.fn();
    render(<SavedElectionsPanel {...createProps({ onRemoveSubject })} />);

    expect(screen.getByText('1 · Historia de la Psicología - Cátedra 34 (II)')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Quitar elección'));
    expect(onRemoveSubject).toHaveBeenCalledWith('34');
  });

  it('permite borrar todas las elecciones con confirmación', () => {
    vi.stubGlobal('confirm', vi.fn(() => true));
    const onRemoveAllSubjects = vi.fn();
    render(<SavedElectionsPanel {...createProps({ onRemoveAllSubjects })} />);

    fireEvent.click(screen.getByLabelText('Quitar todas las elecciones'));
    expect(onRemoveAllSubjects).toHaveBeenCalledTimes(1);
  });
});
