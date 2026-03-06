import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CalendarLegend } from './Legend';

describe('CalendarLegend', () => {
  it('renderiza los tres tipos de contenido', () => {
    render(<CalendarLegend />);
    expect(screen.getByText('Práctico')).toBeInTheDocument();
    expect(screen.getByText('Teórico')).toBeInTheDocument();
    expect(screen.getByText('Seminario')).toBeInTheDocument();
  });
});
