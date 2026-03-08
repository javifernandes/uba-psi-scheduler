import { useCallback, useMemo } from 'react';

export const useLocalStorage = () => {
  const getItem = useCallback((key: string) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  }, []);

  const setItem = useCallback((key: string, value: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  }, []);

  const removeItem = useCallback((key: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  }, []);

  const getJSON = useCallback(
    <T>(key: string): T | null => {
      const raw = getItem(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    },
    [getItem],
  );

  const setJSON = useCallback(
    <T>(key: string, value: T) => {
      setItem(key, JSON.stringify(value));
    },
    [setItem],
  );

  return useMemo(
    () => ({
      getItem,
      setItem,
      removeItem,
      getJSON,
      setJSON,
    }),
    [getItem, getJSON, removeItem, setItem, setJSON],
  );
};
