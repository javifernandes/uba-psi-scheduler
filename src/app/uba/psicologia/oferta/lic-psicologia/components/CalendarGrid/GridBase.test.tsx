import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CalendarGridBase } from './GridBase';
import { DAYS, DAY_LABELS, hourRows } from '../../psicologia-scheduler.utils';

describe('CalendarGridBase', () => {
  it('renderiza encabezados de días y filas horarias', () => {
    render(<CalendarGridBase onEmptyCellEnter={vi.fn()} />);
    DAYS.forEach(day => {
      expect(screen.getByText(DAY_LABELS[day])).toBeInTheDocument();
    });
    expect(screen.getByText(`${String(hourRows[0]).padStart(2, '0')}:00`)).toBeInTheDocument();
    expect(
      screen.getByText(`${String(hourRows[hourRows.length - 1]).padStart(2, '0')}:00`)
    ).toBeInTheDocument();
  });

  it('dispara onEmptyCellEnter al mover el mouse por una celda', () => {
    const onEmptyCellEnter = vi.fn();
    const { container } = render(<CalendarGridBase onEmptyCellEnter={onEmptyCellEnter} />);
    const gridCells = container.querySelectorAll('div.border-l.border-t');
    expect(gridCells.length).toBeGreaterThan(0);
    fireEvent.mouseEnter(gridCells[0] as Element);
    expect(onEmptyCellEnter).toHaveBeenCalledTimes(1);
  });
});
