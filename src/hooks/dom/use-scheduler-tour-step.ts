import { useCallback, useEffect, useState } from 'react';

export const SCHEDULER_TOUR_STEP_CHANGE_EVENT = 'scheduler-tour-step-change';

export type SchedulerTourStepChangedDetail = {
  stepId: string | null;
};

export const getSchedulerTourStep = () => {
  if (typeof window === 'undefined') return null;
  return window.document.body.dataset.schedulerTourStep || null;
};

export const setSchedulerTourStep = (stepId: string | null) => {
  if (typeof window === 'undefined') return;
  if (stepId) {
    window.document.body.dataset.schedulerTourStep = stepId;
  } else {
    delete window.document.body.dataset.schedulerTourStep;
  }
  window.dispatchEvent(
    new CustomEvent<SchedulerTourStepChangedDetail>(SCHEDULER_TOUR_STEP_CHANGE_EVENT, {
      detail: { stepId },
    }),
  );
};

export const useSetSchedulerTourStep = () => {
  return useCallback((stepId: string | null) => {
    setSchedulerTourStep(stepId);
  }, []);
};

export const useSchedulerTourStep = () => {
  const [tourStepId, setTourStepIdState] = useState<string | null>(null);
  const setTourStepId = useSetSchedulerTourStep();

  useEffect(() => {
    setTourStepIdState(getSchedulerTourStep());
    const onStepChange = (event: Event) => {
      const customEvent = event as CustomEvent<SchedulerTourStepChangedDetail>;
      if (customEvent.detail && 'stepId' in customEvent.detail) {
        setTourStepIdState(customEvent.detail.stepId || null);
        return;
      }
      setTourStepIdState(getSchedulerTourStep());
    };
    window.addEventListener(SCHEDULER_TOUR_STEP_CHANGE_EVENT, onStepChange as EventListener);
    return () =>
      window.removeEventListener(SCHEDULER_TOUR_STEP_CHANGE_EVENT, onStepChange as EventListener);
  }, []);

  return { tourStepId, setTourStepId };
};
