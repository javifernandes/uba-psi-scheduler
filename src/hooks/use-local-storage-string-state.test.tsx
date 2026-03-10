import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLocalStorageStringState } from './use-local-storage-string-state';

describe('useLocalStorageStringState', () => {
  it('hidrata desde localStorage y persiste cambios', () => {
    window.localStorage.setItem('s1', 'hello');
    const { result } = renderHook(() => useLocalStorageStringState({ key: 's1' }));

    expect(result.current[0]).toBe('hello');

    act(() => {
      result.current[1]('world');
    });
    expect(window.localStorage.getItem('s1')).toBe('world');
  });

  it('remueve key cuando se setea null', () => {
    window.localStorage.setItem('s2', 'value');
    const { result } = renderHook(() => useLocalStorageStringState({ key: 's2' }));

    act(() => {
      result.current[1](null);
    });

    expect(window.localStorage.getItem('s2')).toBeNull();
  });
});
