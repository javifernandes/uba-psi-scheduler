import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useLocalStorage } from './use-local-storage';

type UseLocalStorageFlagStateParams = {
  key: string;
  trueValue?: string;
  defaultValue?: boolean;
  removeWhenFalse?: boolean;
};

export const useLocalStorageFlagState = ({
  key,
  trueValue = '1',
  defaultValue = false,
  removeWhenFalse = true,
}: UseLocalStorageFlagStateParams): [boolean, Dispatch<SetStateAction<boolean>>] => {
  const storage = useLocalStorage();
  const [flag, setFlag] = useState(() => {
    const raw = storage.getItem(key);
    if (!raw) return defaultValue;
    return raw === trueValue;
  });

  useEffect(() => {
    if (flag) {
      storage.setItem(key, trueValue);
      return;
    }
    if (removeWhenFalse) {
      storage.removeItem(key);
      return;
    }
    storage.setItem(key, '0');
  }, [flag, key, removeWhenFalse, storage, trueValue]);

  return [flag, setFlag];
};
