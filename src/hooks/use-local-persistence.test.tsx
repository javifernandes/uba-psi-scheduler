import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLocalPersistence } from './use-local-persistence';

describe('useLocalPersistence', () => {
  it('lee default cuando no hay valor', () => {
    const { result } = renderHook(() => useLocalPersistence());

    expect(
      result.current.readJSON<{ a: number }, { a: number }>('missing', {
        defaultValue: { a: 42 },
      })
    ).toEqual({ a: 42 });
  });

  it('permite deserialize + normalize al leer', () => {
    const { result } = renderHook(() => useLocalPersistence());

    result.current.writeJSON('enrollments', {
      '34': ' 21 ',
      '35': '4',
    });

    const value = result.current.readJSON<Record<string, string>, Record<string, string>>('enrollments', {
      defaultValue: {},
      deserialize: raw => raw,
      normalize: raw =>
        Object.fromEntries(Object.entries(raw).map(([subjectId, commissionId]) => [subjectId, commissionId.trim()])),
    });

    expect(value).toEqual({
      '34': '21',
      '35': '4',
    });
  });

  it('permite serialize al escribir', () => {
    const { result } = renderHook(() => useLocalPersistence());

    result.current.writeJSON(
      'selection',
      {
        id: '35',
      },
      {
        serialize: value => ({ ...value, persistedAt: 'now' }),
      }
    );

    const stored = result.current.readJSON<{ id: string; persistedAt: string }, { id: string; persistedAt: string }>(
      'selection',
      {
        defaultValue: { id: '', persistedAt: '' },
      }
    );

    expect(stored).toEqual({ id: '35', persistedAt: 'now' });
  });
});
