import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WarningBanner } from './WarningBanner';

describe('WarningBanner', () => {
  it('renderiza el texto esperado con la cátedra recibida', () => {
    render(<WarningBanner catedraLabel="Cátedra 36" onDismiss={vi.fn()} />);

    expect(screen.getByText('CUIDADO!')).toBeInTheDocument();
    expect(screen.getByText(/Comisión de la Cátedra 36/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Si seleccionás otra, se te va a reemplazar automáticamente\./i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Cerrar aviso')).toBeInTheDocument();
  });

  it('ejecuta onDismiss al clickear cerrar', () => {
    const onDismiss = vi.fn();
    render(<WarningBanner catedraLabel="Cátedra 35" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByLabelText('Cerrar aviso'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
