import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { useQueryParamSync } from './use-query-param-sync';

type UseQueryParamStateParams<TValue> = {
  key: string;
  parseFromQuery: (rawValue: string | null) => TValue;
  serializeToQuery: (value: TValue) => string | null;
  init?: (valueFromUrl: TValue) => TValue;
  isEqual?: (a: TValue, b: TValue) => boolean;
};

const identity = <TValue,>(value: TValue) => value;
const defaultIsEqual = <TValue,>(a: TValue, b: TValue) => Object.is(a, b);

export const useQueryParamState = <TValue>({
  key,
  parseFromQuery,
  serializeToQuery,
  init = identity,
  isEqual,
}: UseQueryParamStateParams<TValue>): [TValue, Dispatch<SetStateAction<TValue>>] => {
  const windowTarget = typeof window === 'undefined' ? null : window;

  const parseUrlValue = useCallback(() => {
    const rawValue = windowTarget ? new URLSearchParams(window.location.search).get(key) : null;
    return parseFromQuery(rawValue);
  }, [key, parseFromQuery, windowTarget]);

  const [value, setValue] = useState<TValue>(() => init(parseUrlValue()));
  const isEqualValue = isEqual || defaultIsEqual;

  useQueryParamSync({
    key,
    value,
    setValue,
    parseFromQuery,
    serializeToQuery,
    isEqual: isEqualValue,
  });

  return [value, setValue];
};
