import { useCallback } from 'react';

export const useDispatchEvent = () =>
  useCallback(<T = unknown>(eventName: string, detail?: T) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<T>(eventName, { detail }));
  }, []);

export const useEventDispatcher = <T = unknown>(eventName: string) => {
  const dispatchEvent = useDispatchEvent();
  return useCallback(
    (detail?: T) => {
      dispatchEvent<T>(eventName, detail);
    },
    [dispatchEvent, eventName],
  );
};
