import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConflictBubble } from './ConflictBubble';

const conflicts = [
  {
    slotId: '36|teo|II',
    subjectId: '36',
    subjectLabel: '(2) Psicología Social - Cátedra 36 (II)',
    slotKind: 'Teórico' as const,
    slotCode: 'II',
    venue: 'IN',
    day: 'jueves' as const,
    start: '14:30',
    end: '16:00',
  },
  {
    slotId: '34|prac|21',
    subjectId: '34',
    subjectLabel: '(1) Historia de la Psicología - Cátedra 34 (II)',
    slotKind: 'Comisión' as const,
    slotCode: '21',
    venue: 'HY',
    day: 'jueves' as const,
    start: '14:30',
    end: '16:00',
  },
  {
    slotId: '60|sem|A',
    subjectId: '60',
    subjectLabel: '(10) Estadística - Cátedra 60 (I)',
    slotKind: 'Seminario' as const,
    slotCode: 'A',
    venue: 'SI',
    day: 'viernes' as const,
    start: '09:15',
    end: '10:45',
  },
  {
    slotId: '62|sem|B',
    subjectId: '62',
    subjectLabel: '(12) Estadística II - Cátedra 62 (I)',
    slotKind: 'Seminario' as const,
    slotCode: 'B',
    venue: 'SI',
    day: 'viernes' as const,
    start: '10:45',
    end: '12:15',
  },
];

describe('ConflictBubble', () => {
  it('no renderiza cuando show es false', () => {
    const { container } = render(
      <ConflictBubble show={false} eventId="prac-1" eventType="prac" eventConflicts={conflicts} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza conflictos, copy nuevo y contador de restantes', () => {
    render(<ConflictBubble show eventId="prac-1" eventType="prac" eventConflicts={conflicts} />);
    expect(screen.getByText('Conflicto de horario')).toBeInTheDocument();
    expect(screen.getByText(/Si seleccionás este comisión/)).toBeInTheDocument();
    expect(screen.getByText(/12 · Estadística II/)).toBeInTheDocument();
    expect(screen.getByText(/1 · Historia de la Psicología/)).toBeInTheDocument();
    expect(screen.queryByText(/2 · Psicología Social/)).not.toBeInTheDocument();
    expect(screen.getByText('+1 más')).toBeInTheDocument();
  });
});
