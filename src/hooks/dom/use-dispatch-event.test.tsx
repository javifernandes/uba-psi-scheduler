import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDispatchEvent, useEventDispatcher } from './use-dispatch-event';

describe('useDispatchEvent', () => {
  it('dispara un CustomEvent con el detail recibido', () => {
    const listener = vi.fn();
    window.addEventListener('demo-event', listener as EventListener);
    const { result } = renderHook(() => useDispatchEvent());

    result.current('demo-event', { ok: true });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0]?.[0] as CustomEvent<{ ok: boolean }>;
    expect(event.detail).toEqual({ ok: true });

    window.removeEventListener('demo-event', listener as EventListener);
  });
});

describe('useEventDispatcher', () => {
  it('crea un dispatcher especializado por nombre de evento', () => {
    const listener = vi.fn();
    window.addEventListener('scheduler-tour-step-change', listener as EventListener);
    const { result } = renderHook(() =>
      useEventDispatcher<{ stepId: string | null }>('scheduler-tour-step-change'),
    );

    result.current({ stepId: 'welcome' });

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0]?.[0] as CustomEvent<{ stepId: string | null }>;
    expect(event.detail).toEqual({ stepId: 'welcome' });

    window.removeEventListener('scheduler-tour-step-change', listener as EventListener);
  });
});
