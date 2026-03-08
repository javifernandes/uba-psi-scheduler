import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLocalStorage } from './use-local-storage';

describe('useLocalStorage', () => {
  it('setea, obtiene y elimina strings', () => {
    const { result } = renderHook(() => useLocalStorage());

    result.current.setItem('k1', 'value');
    expect(result.current.getItem('k1')).toBe('value');

    result.current.removeItem('k1');
    expect(result.current.getItem('k1')).toBeNull();
  });

  it('serializa y parsea JSON de forma segura', () => {
    const { result } = renderHook(() => useLocalStorage());

    result.current.setJSON('json', { a: 1 });
    expect(result.current.getJSON<{ a: number }>('json')).toEqual({ a: 1 });

    result.current.setItem('json', 'not-json');
    expect(result.current.getJSON<{ a: number }>('json')).toBeNull();
  });
});
