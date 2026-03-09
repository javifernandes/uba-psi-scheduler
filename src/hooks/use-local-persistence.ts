import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './use-local-storage';

type ReadJSONOptions<TStored, TValue> = {
  defaultValue: TValue;
  deserialize?: (stored: TStored) => TValue;
  normalize?: (value: TValue) => TValue;
};

type WriteJSONOptions<TValue, TStored> = {
  serialize?: (value: TValue) => TStored;
};

export const useLocalPersistence = () => {
  const storage = useLocalStorage();

  const readJSON = useCallback(
    <TStored, TValue = TStored>(key: string, options: ReadJSONOptions<TStored, TValue>): TValue => {
      const raw = storage.getJSON<TStored>(key);
      if (raw === null) return options.defaultValue;
      const decoded = options.deserialize ? options.deserialize(raw) : (raw as TValue);
      return options.normalize ? options.normalize(decoded) : decoded;
    },
    [storage]
  );

  const writeJSON = useCallback(
    <TValue, TStored = TValue>(key: string, value: TValue, options?: WriteJSONOptions<TValue, TStored>) => {
      const encoded = options?.serialize
        ? options.serialize(value)
        : (value as unknown as TStored);
      storage.setJSON<TStored>(key, encoded);
    },
    [storage]
  );

  const remove = useCallback(
    (key: string) => {
      storage.removeItem(key);
    },
    [storage]
  );

  return useMemo(
    () => ({
      readJSON,
      writeJSON,
      remove,
    }),
    [readJSON, remove, writeJSON]
  );
};
