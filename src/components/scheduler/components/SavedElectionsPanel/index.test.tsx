import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SavedElectionsPanel } from './index';
import type { SavedElectionDetail, SubjectData } from '../../scheduler.types';

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
    const onRemoveSubject = vi.fn();
    render(<SavedElectionsPanel {...createProps({ onRemoveSubject })} />);

    expect(screen.getByText('1 · Historia de la Psicología - Cátedra 34 (II)')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Quitar elección'));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar materia' }));
    expect(onRemoveSubject).toHaveBeenCalledWith('34');
  });

  it('permite borrar todas las elecciones con confirmación', () => {
    const onRemoveAllSubjects = vi.fn();
    render(<SavedElectionsPanel {...createProps({ onRemoveAllSubjects })} />);

    fireEvent.click(screen.getByLabelText('Quitar todas las elecciones'));
    fireEvent.click(screen.getByRole('button', { name: 'Borrar todo' }));
    expect(onRemoveAllSubjects).toHaveBeenCalledTimes(1);
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
    render(
      <SavedElectionsPanel
        {...createProps({
          onExportSelections,
          onImportSelections,
          onApplyImportSelections,
        })}
      />
    );

    fireEvent.click(screen.getByLabelText('Exportar elecciones'));
    expect(onExportSelections).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Importar elecciones'));
    const file = new File([JSON.stringify({ version: 1 })], 'plan.json', { type: 'application/json' });
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
