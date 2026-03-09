import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEventListener } from './use-event-listener';

describe('useEventListener', () => {
  it('se suscribe al evento y desuscribe en cleanup', () => {
    const target = new EventTarget();
    const listener = vi.fn();

    const { unmount } = renderHook(() =>
      useEventListener({
        target,
        eventName: 'demo',
        listener,
      })
    );

    target.dispatchEvent(new Event('demo'));
    expect(listener).toHaveBeenCalledTimes(1);

    unmount();
    target.dispatchEvent(new Event('demo'));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('usa el último callback sin volver a registrar el listener', () => {
    const target = new EventTarget();
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = renderHook(
      ({ active }: { active: 'first' | 'second' }) =>
        useEventListener({
          target,
          eventName: 'demo',
          listener: active === 'first' ? first : second,
        }),
      { initialProps: { active: 'first' as const } }
    );

    target.dispatchEvent(new Event('demo'));
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(0);

    rerender({ active: 'second' });
    target.dispatchEvent(new Event('demo'));
    expect(second).toHaveBeenCalledTimes(1);
  });
});
