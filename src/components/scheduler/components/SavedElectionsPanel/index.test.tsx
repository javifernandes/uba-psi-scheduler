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
    lugar: {
      anexo: 'IN',
      aula: '444',
    },
    vacantes: 18,
  },
  teorico: {
    tipo: 'teo',
    id: 'II',
    dia: 'jueves',
    inicio: '12:45',
    fin: '14:15',
    profesor: 'Ibarra Maria Florencia',
    lugar: {
      anexo: 'IN',
      aula: '201',
    },
  },
  seminario: {
    tipo: 'sem',
    id: 'C',
    dia: 'miercoles',
    inicio: '14:30',
    fin: '16:00',
    profesor: 'Rodriguez Sturla Pablo',
    lugar: {
      anexo: 'HY',
      aula: '005',
    },
  },
};

const secondSubject: SubjectData = {
  schemaVersion: 2,
  id: '36',
  label: '(2) Psicología Social - Cátedra 36 (I)',
  header: 'header 36',
  slots: [],
};

const secondSavedDetail: SavedElectionDetail = {
  subject: secondSubject,
  commission: {
    tipo: 'prac',
    id: '7',
    dia: 'martes',
    inicio: '09:15',
    fin: '10:45',
    profesor: 'Ferrari Maria Laura',
    slotsAsociados: [],
    lugar: {
      anexo: 'SI',
      aula: '12',
    },
    vacantes: 9,
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
    expect(screen.getByText('IN 444')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Quitar elección'));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar materia' }));
    expect(onRemoveSavedSubject).toHaveBeenCalledWith('34');
  });

  it('muestra por defecto la vista por materia y permite cambiar a vista por día', () => {
    vi.mocked(useSavedElectionsViewModel).mockReturnValue(createViewModel());
    render(
      <SavedElectionsPanel
        {...createProps({
          savedElectionDetails: [savedDetail, secondSavedDetail],
        })}
      />
    );

    expect(screen.getByText('1 · Historia de la Psicología - Cátedra 34 (II)')).toBeInTheDocument();
    expect(screen.queryByText('Martes')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ver elecciones por día' }));

    expect(screen.getByRole('button', { name: 'Ver elecciones por materia' })).toBeInTheDocument();
    expect(screen.getByText('Martes')).toBeInTheDocument();
    expect(screen.getByText('Miércoles')).toBeInTheDocument();
    expect(screen.getByText('Jueves')).toBeInTheDocument();
    expect(screen.getByText('09:15 10:45')).toBeInTheDocument();
    expect(screen.getAllByText('14:30 16:00')).toHaveLength(2);
    expect(screen.getByText('Comisión 7')).toBeInTheDocument();
    expect(screen.getByText('Comisión 21')).toBeInTheDocument();
    expect(screen.getByText('SI 12')).toBeInTheDocument();
    expect(screen.getByText('IN 444')).toBeInTheDocument();
  });

  it('en vista por día agrupa secciones en orden cronológico', () => {
    vi.mocked(useSavedElectionsViewModel).mockReturnValue(createViewModel());
    render(
      <SavedElectionsPanel
        {...createProps({
          savedElectionDetails: [savedDetail, secondSavedDetail],
        })}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver elecciones por día' }));

    const dayHeadings = screen
      .getAllByRole('heading', { level: 3 })
      .map((node) => node.textContent);
    expect(dayHeadings).toEqual(['Martes', 'Miércoles', 'Jueves']);
  });

  it('muestra warning cuando la comisión guardada quedó sin vacantes', () => {
    vi.mocked(useSavedElectionsViewModel).mockReturnValue(createViewModel());
    render(
      <SavedElectionsPanel
        {...createProps({
          savedElectionDetails: [
            {
              ...savedDetail,
              commission: {
                ...savedDetail.commission,
                vacantes: 0,
              },
            },
          ],
        })}
      />
    );

    expect(screen.getByText('Comisión 21 sin vacantes')).toBeInTheDocument();
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
