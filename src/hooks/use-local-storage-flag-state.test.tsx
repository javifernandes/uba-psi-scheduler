import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLocalStorageFlagState } from './use-local-storage-flag-state';

describe('useLocalStorageFlagState', () => {
  it('hidrata true cuando key vale 1', () => {
    window.localStorage.setItem('flag', '1');
    const { result } = renderHook(() => useLocalStorageFlagState({ key: 'flag' }));
    expect(result.current[0]).toBe(true);
  });

  it('persiste y remueve al cambiar estado', () => {
    const { result } = renderHook(() => useLocalStorageFlagState({ key: 'flag2' }));

    act(() => {
      result.current[1](true);
    });
    expect(window.localStorage.getItem('flag2')).toBe('1');

    act(() => {
      result.current[1](false);
    });
    expect(window.localStorage.getItem('flag2')).toBeNull();
  });
});
