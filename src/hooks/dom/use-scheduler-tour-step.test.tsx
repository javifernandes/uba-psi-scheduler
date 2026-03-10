import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSchedulerTourStep,
  SCHEDULER_TOUR_STEP_CHANGE_EVENT,
  setSchedulerTourStep,
  useSchedulerTourStep,
  useSetSchedulerTourStep,
} from './use-scheduler-tour-step';

describe('useSchedulerTourStep', () => {
  afterEach(() => {
    delete document.body.dataset.schedulerTourStep;
  });

  it('expone el valor actual y se sincroniza al setearlo con el hook', async () => {
    const { result } = renderHook(() => useSchedulerTourStep());

    expect(result.current.tourStepId).toBeNull();

    act(() => {
      result.current.setTourStepId('select-subject');
    });

    await waitFor(() => {
      expect(result.current.tourStepId).toBe('select-subject');
    });
    expect(getSchedulerTourStep()).toBe('select-subject');

    act(() => {
      result.current.setTourStepId(null);
    });

    await waitFor(() => {
      expect(result.current.tourStepId).toBeNull();
    });
    expect(getSchedulerTourStep()).toBeNull();
  });

  it('actualiza el valor cuando recibe el evento global', async () => {
    const { result } = renderHook(() => useSchedulerTourStep());

    act(() => {
      window.dispatchEvent(
        new CustomEvent<{ stepId: string | null }>(SCHEDULER_TOUR_STEP_CHANGE_EVENT, {
          detail: { stepId: 'calendar-overview' },
        }),
      );
    });

    await waitFor(() => {
      expect(result.current.tourStepId).toBe('calendar-overview');
    });
  });
});

describe('useSetSchedulerTourStep', () => {
  afterEach(() => {
    delete document.body.dataset.schedulerTourStep;
  });

  it('escribe en body dataset y dispara scheduler-tour-step-change', () => {
    const listener = vi.fn();
    window.addEventListener(SCHEDULER_TOUR_STEP_CHANGE_EVENT, listener as EventListener);
    const { result } = renderHook(() => useSetSchedulerTourStep());

    act(() => {
      result.current('hover-commission');
    });

    expect(document.body.dataset.schedulerTourStep).toBe('hover-commission');
    expect(listener).toHaveBeenCalledTimes(1);

    const event = listener.mock.calls[0]?.[0] as CustomEvent<{ stepId: string | null }>;
    expect(event.detail).toEqual({ stepId: 'hover-commission' });

    window.removeEventListener(SCHEDULER_TOUR_STEP_CHANGE_EVENT, listener as EventListener);
  });
});
