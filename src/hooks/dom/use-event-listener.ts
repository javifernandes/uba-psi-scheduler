import { useEffect, useRef } from 'react';

type EventMapForTarget<T extends EventTarget> = T extends Window
  ? WindowEventMap
  : T extends Document
    ? DocumentEventMap
    : Record<string, Event>;

type UseEventListenerParams<TTarget extends EventTarget, TEventName extends string> = {
  target: TTarget | null | undefined;
  eventName: TEventName;
  listener: (event: EventMapForTarget<TTarget>[TEventName & keyof EventMapForTarget<TTarget>]) => void;
  options?: boolean | AddEventListenerOptions;
};

export const useEventListener = <TTarget extends EventTarget, TEventName extends string>({
  target,
  eventName,
  listener,
  options,
}: UseEventListenerParams<TTarget, TEventName>) => {
  const listenerRef = useRef(listener);

  useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  useEffect(() => {
    if (!target) return;
    const wrappedListener = (event: Event) => {
      listenerRef.current(
        event as EventMapForTarget<TTarget>[TEventName & keyof EventMapForTarget<TTarget>]
      );
    };

    target.addEventListener(eventName, wrappedListener as EventListener, options);
    return () => {
      target.removeEventListener(eventName, wrappedListener as EventListener, options);
    };
  }, [eventName, options, target]);
};
