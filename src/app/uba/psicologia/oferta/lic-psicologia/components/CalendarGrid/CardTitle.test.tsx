import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardTitle } from './CardTitle';

describe('CardTitle', () => {
  it('renderiza código + label y usa truncado cuando canWrap es false', () => {
    render(<CardTitle code="63" label="BLANK Sofia" type="prac" canWrap={false} hidden={false} />);

    expect(screen.getByText('63')).toHaveClass('text-[#e8b4d7]');
    expect(screen.getByText(/BLANK Sofia/)).toBeInTheDocument();
    expect(screen.getByText(/BLANK Sofia/).parentElement).toHaveClass(
      'truncate',
      'whitespace-nowrap'
    );
  });

  it('usa wrap con style custom cuando canWrap es true y permite ocultar', () => {
    render(
      <CardTitle
        code="II"
        label="Profesor Nombre Largo"
        type="teo"
        canWrap
        wrapStyle={{ WebkitLineClamp: 2 }}
        hidden
      />
    );

    const title = screen.getByText(/Profesor Nombre Largo/).parentElement as HTMLElement;
    expect(title).toHaveClass('whitespace-normal', 'opacity-0');
    expect(title.style.webkitLineClamp).toBe('2');
  });
});
