import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useEventListener } from '@/hooks/dom/use-event-listener';

type UseQueryParamStateParams<TValue> = {
  key: string;
  value: TValue;
  setValue: Dispatch<SetStateAction<TValue>>;
  parseFromQuery: (rawValue: string | null) => TValue;
  serializeToQuery: (value: TValue) => string | null;
  isEqual?: (a: TValue, b: TValue) => boolean;
};

const defaultIsEqual = <TValue,>(a: TValue, b: TValue) => Object.is(a, b);

export const useQueryParamState = <TValue>({
  key,
  value,
  setValue,
  parseFromQuery,
  serializeToQuery,
  isEqual = defaultIsEqual,
}: UseQueryParamStateParams<TValue>) => {
  const windowTarget = typeof window === 'undefined' ? null : window;

  const syncStateFromUrl = useCallback(() => {
    if (typeof window === 'undefined') return;
    const rawValue = new URLSearchParams(window.location.search).get(key);
    const parsedValue = parseFromQuery(rawValue);
    setValue(prev => (isEqual(prev, parsedValue) ? prev : parsedValue));
  }, [isEqual, key, parseFromQuery, setValue]);

  useEventListener({
    target: windowTarget,
    eventName: 'popstate',
    listener: syncStateFromUrl,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const nextEncodedValue = serializeToQuery(value);
    const currentUrl = new URL(window.location.href);
    const currentEncodedValue = currentUrl.searchParams.get(key);

    if (!nextEncodedValue) {
      if (!currentUrl.searchParams.has(key)) return;
      currentUrl.searchParams.delete(key);
      window.history.replaceState(window.history.state, '', currentUrl.toString());
      return;
    }

    if (currentEncodedValue === nextEncodedValue) return;
    currentUrl.searchParams.set(key, nextEncodedValue);
    window.history.replaceState(window.history.state, '', currentUrl.toString());
  }, [key, serializeToQuery, value]);
};
