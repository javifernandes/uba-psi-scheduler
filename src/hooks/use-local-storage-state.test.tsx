import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLocalStorageState } from './use-local-storage-state';

describe('useLocalStorageState', () => {
  it('hidrata desde localStorage y persiste updates', async () => {
    window.localStorage.setItem('k', JSON.stringify({ a: 1 }));

    const { result } = renderHook(() =>
      useLocalStorageState<Record<string, number>>({
        key: 'k',
        defaultValue: {},
      })
    );

    await waitFor(() => {
      expect(result.current[0]).toEqual({ a: 1 });
      expect(result.current[2].isHydrated).toBe(true);
    });

    act(() => {
      result.current[1]({ b: 2 });
    });

    await waitFor(() => {
      expect(window.localStorage.getItem('k')).toBe(JSON.stringify({ b: 2 }));
    });
  });

  it('aplica normalize al hidratar', async () => {
    window.localStorage.setItem('k2', JSON.stringify({ x: ' 1 ' }));

    const { result } = renderHook(() =>
      useLocalStorageState<Record<string, string>>({
        key: 'k2',
        defaultValue: {},
        normalize: value =>
          Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, entryValue.trim()])),
      })
    );

    await waitFor(() => {
      expect(result.current[0]).toEqual({ x: '1' });
    });
  });

  it('respeta enabled=false y no hidrata ni persiste', () => {
    window.localStorage.setItem('k3', JSON.stringify({ z: 9 }));

    const { result } = renderHook(() =>
      useLocalStorageState<Record<string, number>>({
        key: 'k3',
        defaultValue: {},
        enabled: false,
      })
    );

    expect(result.current[0]).toEqual({});
    expect(result.current[2].isHydrated).toBe(false);

    act(() => {
      result.current[1]({ q: 5 });
    });

    expect(window.localStorage.getItem('k3')).toBe(JSON.stringify({ z: 9 }));
  });
});
