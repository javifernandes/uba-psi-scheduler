import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarGrid } from './index';
import type { VisibleEventSlot } from './types';

vi.mock('./EventCard', () => ({
  CalendarEventCard: ({ slot }: { slot: VisibleEventSlot }) => (
    <div data-testid="event-card">{slot.event.id}</div>
  ),
}));

const slotA: VisibleEventSlot = {
  slotKey: 'lunes|09:00|10:30',
  stackSize: 1,
  stackIndex: 0,
  slotEvents: [],
  event: {
    tipo: 'prac',
    id: 'prac-1',
    dia: 'lunes',
    inicio: '09:00',
    fin: '10:30',
    aula: 'IN-101',
    title: '1 - Profesor',
    linkedCommissionId: '1',
    sourceSubjectId: 's1',
    sourceSubjectLabel: 'Materia',
  },
};

const slotB: VisibleEventSlot = {
  ...slotA,
  slotKey: 'martes|09:00|10:30',
  event: { ...slotA.event, id: 'prac-2', dia: 'martes', linkedCommissionId: '2' },
};

describe('CalendarGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renderiza leyenda y una EventCard por slot visible', () => {
    render(
      <CalendarGrid
        visibleEventSlots={[slotA, slotB]}
        activeCommission={null}
        selectedSubjectId="s1"
        enrolledBySubject={{}}
        enrolledCurrentCommissionId={undefined}
        conflictByEventId={{}}
        hoveredConflictEventId={null}
        setHoveredConflictEventId={vi.fn()}
        hoveredCommissionId={null}
        setHoveredCommissionId={vi.fn()}
        pinnedCommissionId={null}
        setPinnedCommissionId={vi.fn()}
        setStackIndexBySlot={vi.fn()}
        onToggleEnrollment={vi.fn()}
      />
    );

    expect(screen.getByText('Práctico')).toBeInTheDocument();
    expect(screen.getAllByTestId('event-card')).toHaveLength(2);
    expect(screen.getByText('prac-1')).toBeInTheDocument();
    expect(screen.getByText('prac-2')).toBeInTheDocument();
  });

  it('en celda vacía limpia hover/conflict/pin solo cuando están activos', () => {
    const setHoveredConflictEventId = vi.fn();
    const setHoveredCommissionId = vi.fn();
    const setPinnedCommissionId = vi.fn();
    const { container } = render(
      <CalendarGrid
        visibleEventSlots={[slotA]}
        activeCommission={null}
        selectedSubjectId="s1"
        enrolledBySubject={{}}
        enrolledCurrentCommissionId={undefined}
        conflictByEventId={{}}
        hoveredConflictEventId="prac-1"
        setHoveredConflictEventId={setHoveredConflictEventId}
        hoveredCommissionId="1"
        setHoveredCommissionId={setHoveredCommissionId}
        pinnedCommissionId="1"
        setPinnedCommissionId={setPinnedCommissionId}
        setStackIndexBySlot={vi.fn()}
        onToggleEnrollment={vi.fn()}
      />
    );

    const emptyCell = container.querySelector('div.border-l.border-t') as Element;
    fireEvent.mouseEnter(emptyCell);
    vi.advanceTimersByTime(200);
    expect(setHoveredCommissionId).toHaveBeenCalled();
    expect(setHoveredConflictEventId).toHaveBeenCalled();
    expect(setPinnedCommissionId).toHaveBeenCalledWith(null);
  });
});
