import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConflictBubble } from './ConflictBubble';

const conflicts = [
  {
    slotId: '36|teo|II',
    subjectId: '36',
    subjectLabel: '(2) Psicología Social - Cátedra 36 (II)',
    day: 'jueves' as const,
    start: '14:30',
    end: '16:00',
    title: 'II - Ferrari Liliana',
  },
  {
    slotId: '34|prac|21',
    subjectId: '34',
    subjectLabel: '(1) Historia de la Psicología - Cátedra 34 (II)',
    day: 'jueves' as const,
    start: '14:30',
    end: '16:00',
    title: '21 - Cazes Marcela',
  },
  {
    slotId: '60|sem|A',
    subjectId: '60',
    subjectLabel: '(10) Estadística - Cátedra 60 (I)',
    day: 'viernes' as const,
    start: '09:15',
    end: '10:45',
    title: 'A - Otro',
  },
];

describe('ConflictBubble', () => {
  it('no renderiza cuando show es false', () => {
    const { container } = render(
      <ConflictBubble show={false} eventId="prac-1" eventConflicts={conflicts} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza hasta dos conflictos y contador de restantes', () => {
    render(<ConflictBubble show eventId="prac-1" eventConflicts={conflicts} />);
    expect(screen.getByText('Conflicto de horario')).toBeInTheDocument();
    expect(screen.getByText(/\(2\) Psicología Social/)).toBeInTheDocument();
    expect(screen.getByText(/\(1\) Historia de la Psicología/)).toBeInTheDocument();
    expect(screen.queryByText(/\(10\) Estadística/)).not.toBeInTheDocument();
    expect(screen.getByText('+1 más')).toBeInTheDocument();
  });
});
