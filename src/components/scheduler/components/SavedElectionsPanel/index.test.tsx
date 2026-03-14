import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SavedElectionsPanel } from './index';
import type { SavedElectionDetail, SubjectData } from '../../scheduler.types';
import { useSavedElectionsViewModel } from '../../hooks/use-saved-elections-view-model';

vi.mock('../../hooks/use-saved-elections-view-model', () => ({
  useSavedElectionsViewModel: vi.fn(),
}));

const subject: SubjectData = {
  schemaVersion: 2,
  id: '34',
  label: '(1) Historia de la Psicología - Cátedra 34 (II)',
  header: 'header',
  slots: [],
};

const savedDetail: SavedElectionDetail = {
  subject,
  commission: {
    tipo: 'prac',
    id: '21',
    dia: 'jueves',
    inicio: '14:30',
    fin: '16:00',
    profesor: 'Cazes Marcela Adriana',
    slotsAsociados: [
      { slotId: 'C', rol: 'sem', condicion: 'obligatorio' },
      { slotId: 'II', rol: 'teo', condicion: 'obligatorio' },
    ],
    aula: 'IN-444',
    vacantes: 18,
  },
  teorico: {
    tipo: 'teo',
    id: 'II',
    dia: 'jueves',
    inicio: '12:45',
    fin: '14:15',
    profesor: 'Ibarra Maria Florencia',
    aula: 'IN-201',
  },
  seminario: {
    tipo: 'sem',
    id: 'C',
    dia: 'miercoles',
    inicio: '14:30',
    fin: '16:00',
    profesor: 'Rodriguez Sturla Pablo',
    aula: 'HY-005',
  },
};

const createProps = (overrides: Partial<Parameters<typeof SavedElectionsPanel>[0]> = {}) => ({
  isOpen: true,
  savedElectionDetails: [savedDetail],
  savedConflictDetailsBySlot: {},
  alwaysConflictingSavedSlotIds: new Set<string>(),
  highlightedConflictSlotIds: new Set<string>(),
  onOpenPanel: vi.fn(),
  onToggleOpen: vi.fn(),
  ...overrides,
});

const createViewModel = (
  overrides: Partial<ReturnType<typeof useSavedElectionsViewModel>> = {}
) => ({
  onRemoveSavedSubject: vi.fn(),
  onRemoveAllSavedSubjects: vi.fn(),
  onExportSelections: vi.fn(),
  onImportSelections: vi.fn(async () => ({
    period: '2026-01',
    totalEntries: 1,
    mapped: [
      {
        catedra: 34,
        comision: '21',
        subjectId: '34',
        subjectLabel: '(1) Historia de la Psicología - Cátedra 34 (II)',
      },
    ],
    rejected: [],
    mappedBySubject: {
      '34': '21',
    },
  })),
  onApplyImportSelections: vi.fn(async () => {}),
  ...overrides,
});

describe('SavedElectionsPanel', () => {
  it('muestra estado vacío cuando está abierto sin elecciones', () => {
    vi.mocked(useSavedElectionsViewModel).mockReturnValue(createViewModel());
    render(<SavedElectionsPanel {...createProps({ savedElectionDetails: [] })} />);
    expect(screen.getByText('Sin elecciones guardadas.')).toBeInTheDocument();
  });

  it('en colapsado muestra contador y ejecuta onOpenPanel al clickear el contenedor', () => {
    vi.mocked(useSavedElectionsViewModel).mockReturnValue(createViewModel());
    const onOpenPanel = vi.fn();
    render(
      <SavedElectionsPanel
        {...createProps({
          isOpen: false,
          savedElectionDetails: [savedDetail, savedDetail, savedDetail],
          onOpenPanel,
        })}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Mis elecciones'));
    expect(onOpenPanel).toHaveBeenCalled();
  });

  it('renderiza elección y permite quitar materia', () => {
    const onRemoveSavedSubject = vi.fn();
    vi.mocked(useSavedElectionsViewModel).mockReturnValue(
      createViewModel({ onRemoveSavedSubject })
    );
    render(<SavedElectionsPanel {...createProps()} />);

    expect(screen.getByText('1 · Historia de la Psicología - Cátedra 34 (II)')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Quitar elección'));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar materia' }));
    expect(onRemoveSavedSubject).toHaveBeenCalledWith('34');
  });

  it('permite borrar todas las elecciones con confirmación', () => {
    const onRemoveAllSavedSubjects = vi.fn();
    vi.mocked(useSavedElectionsViewModel).mockReturnValue(
      createViewModel({ onRemoveAllSavedSubjects })
    );
    render(<SavedElectionsPanel {...createProps()} />);

    fireEvent.click(screen.getByLabelText('Quitar todas las elecciones'));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar todo' }));
    expect(onRemoveAllSavedSubjects).toHaveBeenCalledTimes(1);
  });

  it('ejecuta export e import desde el flujo modal', async () => {
    const onExportSelections = vi.fn();
    const onImportSelections = vi.fn(async () => ({
      period: '2026-01',
      totalEntries: 1,
      mapped: [
        {
          catedra: 34,
          comision: '21',
          subjectId: '34',
          subjectLabel: '(1) Historia de la Psicología - Cátedra 34 (II)',
        },
      ],
      rejected: [],
      mappedBySubject: {
        '34': '21',
      },
    }));
    const onApplyImportSelections = vi.fn(async () => {});
    vi.mocked(useSavedElectionsViewModel).mockReturnValue(
      createViewModel({
        onExportSelections,
        onImportSelections,
        onApplyImportSelections,
      })
    );
    render(<SavedElectionsPanel {...createProps()} />);

    fireEvent.click(screen.getByLabelText('Exportar elecciones'));
    expect(onExportSelections).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Importar elecciones'));
    const file = new File([JSON.stringify({ version: 1 })], 'plan.json', {
      type: 'application/json',
    });
    const dialog = screen.getByRole('dialog', { name: 'Importar elecciones' });
    const input = dialog.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    expect(await screen.findByText(/Aplicables/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar importación' }));
    expect(await screen.findByText('Importación lista: 1 materias aplicadas.')).toBeInTheDocument();
    expect(onImportSelections).toHaveBeenCalledTimes(1);
    expect(onApplyImportSelections).toHaveBeenCalledTimes(1);
  });
});
