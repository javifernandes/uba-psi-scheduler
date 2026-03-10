import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocalStorage } from './use-local-storage';

type UseLocalStorageStringStateParams = {
  key: string;
  defaultValue?: string | null;
};

export const useLocalStorageStringState = ({
  key,
  defaultValue = null,
}: UseLocalStorageStringStateParams): [string | null, Dispatch<SetStateAction<string | null>>] => {
  const storage = useLocalStorage();
  const [value, setValue] = useState<string | null>(() => {
    const raw = storage.getItem(key);
    return raw ?? defaultValue;
  });

  useEffect(() => {
    if (value === null) {
      storage.removeItem(key);
      return;
    }
    storage.setItem(key, value);
  }, [key, storage, value]);

  return [value, setValue];
};
