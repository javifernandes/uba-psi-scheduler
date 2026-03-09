import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSchedulerTour } from './use-scheduler-tour';

const TOUR_SEEN_STORAGE_KEY = 'uba_psico_scheduler_tour_seen_v1';
const TOUR_ACTIVE_STORAGE_KEY = 'uba_psico_scheduler_tour_active_v1';
const TOUR_BACKUP_STORAGE_KEY = 'uba_psico_scheduler_tour_backup_v1';
const AUTO_START_DELAY_MS = 360;

const { mockTourInstances, launchSurveyMock } = vi.hoisted(() => ({
  mockTourInstances: [] as any[],
  launchSurveyMock: vi.fn(),
}));

vi.mock('shepherd.js', () => {
  class MockTour {
    handlers: Record<string, Array<() => void>> = {};
    steps: any[] = [];
    currentStepIndex = -1;

    constructor(..._args: unknown[]) {
      mockTourInstances.push(this);
    }

    on(eventName: string, handler: () => void) {
      this.handlers[eventName] = this.handlers[eventName] || [];
      this.handlers[eventName].push(handler);
    }

    addSteps(steps: any[]) {
      this.steps = steps;
    }

    getCurrentStep() {
      if (this.currentStepIndex < 0) return null;
      return this.steps[this.currentStepIndex] || null;
    }

    start() {
      this.currentStepIndex = 0;
      this.emit('show');
    }

    next() {
      this.currentStepIndex = Math.min(this.currentStepIndex + 1, this.steps.length - 1);
      this.emit('show');
    }

    cancel() {
      this.emit('cancel');
    }

    complete() {
      this.emit('complete');
    }

    private emit(eventName: string) {
      (this.handlers[eventName] || []).forEach(handler => handler());
    }
  }

  return {
    default: {
      Tour: MockTour,
    },
  };
});

vi.mock('./use-survey', () => {
  return {
    default: () => ({
      launchSurvey: launchSurveyMock,
    }),
  };
});

vi.mock('@/hooks/dom/use-wait-for-selector', () => {
  return {
    useWaitForSelector: () => vi.fn(async () => undefined),
    useWaitForAnySelector: () => vi.fn(async () => undefined),
  };
});

vi.mock('@/hooks/dom/use-scheduler-tour-step', () => {
  return {
    useSetSchedulerTourStep: () => vi.fn(),
  };
});

describe('useSchedulerTour', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockTourInstances.length = 0;
    launchSurveyMock.mockClear();
    vi.useRealTimers();
  });

  const renderSubject = (overrides?: {
    selectedSubjectId?: string;
    enrolledBySubject?: Record<string, string>;
  }) => {
    const setSelectedSubjectId = vi.fn();
    const setEnrolledBySubject = vi.fn();

    const hook = renderHook(() =>
      useSchedulerTour({
        selectedSubjectId: overrides?.selectedSubjectId || '35',
        setSelectedSubjectId,
        enrolledBySubject: overrides?.enrolledBySubject || { '35': '4' },
        setEnrolledBySubject,
        setIsMateriaPanelOpen: vi.fn(),
        setIsMateriaDropdownOpen: vi.fn(),
        setIsEleccionesPanelOpen: vi.fn(),
        setIsMostrarPanelOpen: vi.fn(),
        setIsSedesPanelOpen: vi.fn(),
      })
    );

    return {
      ...hook,
      setSelectedSubjectId,
      setEnrolledBySubject,
    };
  };

  it('no inicia tour cuando ya fue visto y force=false', () => {
    window.localStorage.setItem(TOUR_SEEN_STORAGE_KEY, '1');
    const { result } = renderSubject();

    act(() => {
      result.current.startTour(false);
    });

    expect(mockTourInstances).toHaveLength(0);
  });

  it('inicia tour forzado y al cancelar restaura backup + dispara survey', async () => {
    const { result, setSelectedSubjectId, setEnrolledBySubject } = renderSubject({
      selectedSubjectId: '35',
      enrolledBySubject: { '35': '4' },
    });

    act(() => {
      result.current.startTour(true);
    });

    expect(mockTourInstances).toHaveLength(1);
    const tour = mockTourInstances[0];
    const welcomeStep = tour.steps.find((step: any) => step.id === 'welcome');
    const startButton = welcomeStep.buttons.find((button: any) => button.text === 'Comenzar');

    act(() => {
      startButton.action();
    });

    expect(setSelectedSubjectId).toHaveBeenCalledWith('');
    expect(setEnrolledBySubject).toHaveBeenCalledWith({});

    act(() => {
      tour.cancel();
    });

    await waitFor(() => {
      expect(setSelectedSubjectId).toHaveBeenCalledWith('35');
      expect(setEnrolledBySubject).toHaveBeenCalledWith({ '35': '4' });
    });

    expect(window.localStorage.getItem(TOUR_BACKUP_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(TOUR_ACTIVE_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(TOUR_SEEN_STORAGE_KEY)).toBe('1');
    expect(launchSurveyMock).toHaveBeenCalledTimes(1);
  });

  it('autostart: inicia automáticamente cuando no fue visto', () => {
    vi.useFakeTimers();
    renderSubject();

    expect(mockTourInstances).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(AUTO_START_DELAY_MS + 1);
    });

    expect(mockTourInstances).toHaveLength(1);
  });

  it('si quedó activo en localStorage, restaura backup al montar', async () => {
    window.localStorage.setItem(TOUR_ACTIVE_STORAGE_KEY, '1');
    window.localStorage.setItem(
      TOUR_BACKUP_STORAGE_KEY,
      JSON.stringify({ selectedSubjectId: '60', enrolledBySubject: { '60': '7' } })
    );

    const { setSelectedSubjectId, setEnrolledBySubject } = renderSubject({
      selectedSubjectId: '',
      enrolledBySubject: {},
    });

    await waitFor(() => {
      expect(setSelectedSubjectId).toHaveBeenCalledWith('60');
      expect(setEnrolledBySubject).toHaveBeenCalledWith({ '60': '7' });
    });

    expect(window.localStorage.getItem(TOUR_BACKUP_STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(TOUR_ACTIVE_STORAGE_KEY)).toBeNull();
  });
});
