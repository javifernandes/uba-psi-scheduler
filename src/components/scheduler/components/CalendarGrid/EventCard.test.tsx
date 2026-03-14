import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarEventCard } from './EventCard';
import type { VisibleEventSlot } from './types';

const mockUseCalendarEventCardState = vi.fn();
const mockUseEventCardInteractions = vi.fn();

vi.mock('./useCalendarEventCardState', () => ({
  useCalendarEventCardState: (...args: unknown[]) => mockUseCalendarEventCardState(...args),
}));

vi.mock('./useEventCardInteractions', () => ({
  useEventCardInteractions: (...args: unknown[]) => mockUseEventCardInteractions(...args),
}));

const slot: VisibleEventSlot = {
  slotKey: 'jueves|14:30|16:00',
  stackSize: 2,
  stackIndex: 0,
  slotEvents: [],
  event: {
    tipo: 'prac',
    id: 'prac-21',
    dia: 'jueves',
    inicio: '14:30',
    fin: '16:00',
    aula: 'IN-444',
    title: '21 - Cazes',
    vacantes: 9,
    linkedCommissionId: '21',
    sourceSubjectId: '34',
    sourceSubjectLabel: 'Materia',
  },
};

const externalSlot: VisibleEventSlot = {
  ...slot,
  slotKey: 'jueves|09:15|10:45',
  event: {
    ...slot.event,
    id: 'ext-36-prac-1',
    title: '1 - Ferrari',
    sourceSubjectId: '36',
    sourceSubjectLabel: '(2) Psicología Social - Cátedra 36 (II)',
    isExternal: true,
  },
};

const interactionHandlers = {
  onCardMouseEnter: vi.fn(),
  onCardMouseLeave: vi.fn(),
  onCardClick: vi.fn(),
  onCardKeyDown: vi.fn(),
  onSaveButtonClick: vi.fn(),
  onStackPrevClick: vi.fn(),
  onStackNextClick: vi.fn(),
};

const baseState = {
  aulaParts: { prefix: 'IN', room: '444' },
  titleParts: { code: '21', label: 'Cazes' },
  canWrapLabel: false,
  canSaveFromCard: true,
  isSavedFromCard: false,
  isActive: true,
  isEnrolledCurrent: false,
  shouldDim: false,
  hideText: false,
  eventConflicts: [],
  hasConflict: false,
  showConflictBubble: false,
  layoutStyle: {},
  titleWrapStyle: undefined,
};

describe('CalendarEventCard', () => {
  beforeEach(() => {
    mockUseCalendarEventCardState.mockReset();
    mockUseEventCardInteractions.mockReset();
    Object.values(interactionHandlers).forEach((fn) => fn.mockReset());
    mockUseCalendarEventCardState.mockReturnValue(baseState);
    mockUseEventCardInteractions.mockReturnValue(interactionHandlers);
  });

  it('renderiza datos base, muestra save button y delega eventos del contenedor', () => {
    const { container } = render(
      <CalendarEventCard
        slot={slot}
        activeCommission={null}
        selectedSubjectId="34"
        showCalendarOnlyTimes={false}
        onCalendarOnlyExternalEnter={vi.fn()}
        onCalendarOnlyExternalLeave={vi.fn()}
        enrolledBySubject={{}}
        enrolledCurrentCommissionId={undefined}
        conflictByEventId={{}}
        hoveredConflictEventId={null}
        setHoveredConflictEventId={vi.fn()}
        setHoveredCommissionId={vi.fn()}
        setHoveredLinkedTeoricoId={vi.fn()}
        setHoveredLinkedSeminarioId={vi.fn()}
        setPinnedCommissionId={vi.fn()}
        setStackIndexBySlot={vi.fn()}
        onToggleEnrollment={vi.fn()}
      />
    );

    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText(/Cazes/)).toBeInTheDocument();
    expect(screen.getByText('9 vacantes · cupo bajo')).toBeInTheDocument();
    expect(screen.getByLabelText('Guardar o quitar esta comisión elegida')).toBeInTheDocument();
    expect(screen.getByText('☆')).toBeInTheDocument();

    const card = container.querySelector('div[role="button"][tabindex="0"]') as Element;
    fireEvent.mouseEnter(card);
    fireEvent.mouseLeave(card);
    fireEvent.click(card);
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(interactionHandlers.onCardMouseEnter).toHaveBeenCalled();
    expect(interactionHandlers.onCardMouseLeave).toHaveBeenCalled();
    expect(interactionHandlers.onCardClick).toHaveBeenCalled();
    expect(interactionHandlers.onCardKeyDown).toHaveBeenCalled();
  });

  it('renderiza estado con conflicto y guardado activo', () => {
    mockUseCalendarEventCardState.mockReturnValue({
      ...baseState,
      hasConflict: true,
      showConflictBubble: true,
      eventConflicts: [
        {
          slotId: '36|teo|II',
          subjectId: '36',
          subjectLabel: '(2) Psicología Social - Cátedra 36 (II)',
          slotKind: 'Teórico',
          slotCode: 'II',
          venue: 'IN',
          day: 'jueves',
          start: '14:30',
          end: '16:00',
        },
      ],
      isSavedFromCard: true,
    });

    render(
      <CalendarEventCard
        slot={slot}
        activeCommission={null}
        selectedSubjectId="34"
        showCalendarOnlyTimes={false}
        onCalendarOnlyExternalEnter={vi.fn()}
        onCalendarOnlyExternalLeave={vi.fn()}
        enrolledBySubject={{}}
        enrolledCurrentCommissionId={undefined}
        conflictByEventId={{}}
        hoveredConflictEventId="prac-21"
        setHoveredConflictEventId={vi.fn()}
        setHoveredCommissionId={vi.fn()}
        setHoveredLinkedTeoricoId={vi.fn()}
        setHoveredLinkedSeminarioId={vi.fn()}
        setPinnedCommissionId={vi.fn()}
        setStackIndexBySlot={vi.fn()}
        onToggleEnrollment={vi.fn()}
      />
    );

    expect(screen.getByText('!')).toBeInTheDocument();
    expect(screen.getByText('Conflicto de horario')).toBeInTheDocument();
    expect(screen.getByText('★')).toBeInTheDocument();
  });

  it('en eventos externos muestra layout simplificado por materia/cátedra y sede', () => {
    render(
      <CalendarEventCard
        slot={externalSlot}
        activeCommission={null}
        selectedSubjectId="34"
        showCalendarOnlyTimes={false}
        onCalendarOnlyExternalEnter={vi.fn()}
        onCalendarOnlyExternalLeave={vi.fn()}
        enrolledBySubject={{ '36': '21' }}
        enrolledCurrentCommissionId={undefined}
        conflictByEventId={{}}
        hoveredConflictEventId={null}
        setHoveredConflictEventId={vi.fn()}
        setHoveredCommissionId={vi.fn()}
        setHoveredLinkedTeoricoId={vi.fn()}
        setHoveredLinkedSeminarioId={vi.fn()}
        setPinnedCommissionId={vi.fn()}
        setStackIndexBySlot={vi.fn()}
        onToggleEnrollment={vi.fn()}
      />
    );

    expect(screen.getByText('Psicología Social')).toBeInTheDocument();
    expect(screen.getByText('Cátedra 36 (II)')).toBeInTheDocument();
    expect(screen.getByText('IN')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Guardar o quitar esta comisión elegida')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('09:15')).not.toBeInTheDocument();
    expect(screen.queryByText('10:45')).not.toBeInTheDocument();
  });

  it('en modo mi calendario muestra horas en eventos externos', () => {
    render(
      <CalendarEventCard
        slot={externalSlot}
        activeCommission={null}
        selectedSubjectId=""
        showCalendarOnlyTimes={true}
        onCalendarOnlyExternalEnter={vi.fn()}
        onCalendarOnlyExternalLeave={vi.fn()}
        enrolledBySubject={{ '36': '21' }}
        enrolledCurrentCommissionId={undefined}
        conflictByEventId={{}}
        hoveredConflictEventId={null}
        setHoveredConflictEventId={vi.fn()}
        setHoveredCommissionId={vi.fn()}
        setHoveredLinkedTeoricoId={vi.fn()}
        setHoveredLinkedSeminarioId={vi.fn()}
        setPinnedCommissionId={vi.fn()}
        setStackIndexBySlot={vi.fn()}
        onToggleEnrollment={vi.fn()}
      />
    );

    expect(screen.getByText('14:30')).toBeInTheDocument();
    expect(screen.getByText('16:00')).toBeInTheDocument();
  });
});
