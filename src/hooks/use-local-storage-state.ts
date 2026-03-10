import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useLocalPersistence } from './use-local-persistence';

type UseLocalStorageStateParams<TValue> = {
  key: string;
  defaultValue: TValue;
  enabled?: boolean;
  normalize?: (value: TValue) => TValue;
  isEqual?: (a: TValue, b: TValue) => boolean;
  rehydrateToken?: string | number;
};

type UseLocalStorageStateResult<TValue> = [
  TValue,
  Dispatch<SetStateAction<TValue>>,
  {
    isHydrated: boolean;
  },
];

const defaultIsEqual = <TValue,>(a: TValue, b: TValue) => Object.is(a, b);

export const useLocalStorageState = <TValue>({
  key,
  defaultValue,
  enabled = true,
  normalize,
  isEqual = defaultIsEqual,
  rehydrateToken,
}: UseLocalStorageStateParams<TValue>): UseLocalStorageStateResult<TValue> => {
  const localPersistence = useLocalPersistence();
  const defaultValueRef = useRef(defaultValue);
  const normalizeRef = useRef(normalize);
  const isEqualRef = useRef(isEqual);
  const [value, setValue] = useState(defaultValue);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    defaultValueRef.current = defaultValue;
    normalizeRef.current = normalize;
    isEqualRef.current = isEqual;
  }, [defaultValue, isEqual, normalize]);

  useEffect(() => {
    if (!enabled) {
      setIsHydrated(false);
      return;
    }

    const hydratedValue = localPersistence.readJSON<TValue, TValue>(key, {
      defaultValue: defaultValueRef.current,
      normalize: nextValue => (normalizeRef.current ? normalizeRef.current(nextValue) : nextValue),
    });

    setValue(prev => (isEqualRef.current(prev, hydratedValue) ? prev : hydratedValue));
    setIsHydrated(true);
    // rehydrateToken lets callers explicitly re-read storage when external domain context changes.
  }, [enabled, key, localPersistence, rehydrateToken]);

  useEffect(() => {
    if (!enabled || !isHydrated) return;
    localPersistence.writeJSON(key, value);
  }, [enabled, isHydrated, key, localPersistence, value]);

  return [value, setValue, { isHydrated }];
};
