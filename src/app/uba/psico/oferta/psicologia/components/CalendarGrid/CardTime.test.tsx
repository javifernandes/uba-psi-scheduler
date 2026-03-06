import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardTime } from './CardTime';

describe('CardTime', () => {
  it('renderiza hora con posición superior e inferior', () => {
    const { rerender } = render(
      <CardTime value="09:15" type="prac" position="top" hidden={false} />
    );
    const top = screen.getByText('09:15');
    expect(top).toHaveClass('left-2', 'top-0.5');

    rerender(<CardTime value="10:45" type="teo" position="bottom" hidden={false} />);
    const bottom = screen.getByText('10:45');
    expect(bottom).toHaveClass('bottom-0.5', 'left-2');
  });

  it('aplica opacidad cuando hidden es true', () => {
    render(<CardTime value="12:30" type="sem" position="top" hidden />);
    expect(screen.getByText('12:30')).toHaveClass('opacity-0');
  });
});
