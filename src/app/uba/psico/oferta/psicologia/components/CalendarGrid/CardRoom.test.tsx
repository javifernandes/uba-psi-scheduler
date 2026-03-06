import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardRoom } from './CardRoom';

describe('CardRoom', () => {
  it('renderiza prefijo y aula con clases por tipo', () => {
    render(<CardRoom prefix="HY" room="005" type="sem" hidden={false} />);
    expect(screen.getByText('HY')).toHaveClass('text-[#8d5722]');
    expect(screen.getByText('005')).toHaveClass('text-[#111827]');
  });

  it('aplica opacidad a contenedor y textos cuando hidden es true', () => {
    const { container } = render(<CardRoom prefix="IN" room="201" type="teo" hidden />);
    expect(container.firstChild).toHaveClass('opacity-0');
    expect(screen.getByText('IN')).toHaveClass('opacity-0');
    expect(screen.getByText('201')).toHaveClass('opacity-0');
  });
});
