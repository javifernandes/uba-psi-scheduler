import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StackSwitcher } from './StackSwitcher';

describe('StackSwitcher', () => {
  it('no renderiza cuando stackSize <= 1', () => {
    const { container } = render(
      <StackSwitcher stackSize={1} onPrevClick={vi.fn()} onNextClick={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renderiza contador y dispara callbacks prev/next', () => {
    const onPrevClick = vi.fn();
    const onNextClick = vi.fn();
    render(<StackSwitcher stackSize={3} onPrevClick={onPrevClick} onNextClick={onNextClick} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Ver anterior en este horario'));
    fireEvent.click(screen.getByLabelText('Ver siguiente en este horario'));
    expect(onPrevClick).toHaveBeenCalledTimes(1);
    expect(onNextClick).toHaveBeenCalledTimes(1);
  });
});
