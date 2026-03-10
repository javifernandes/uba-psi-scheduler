import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { useQueryParamSync } from './use-query-param-sync';

const parseFromQuery = (rawValue: string | null) => (rawValue && rawValue !== 'invalid' ? rawValue : '');
const serializeToQuery = (value: string) => (value ? value : null);

const useHarness = (initialValue = '') => {
  const [selected, setSelected] = useState(initialValue);
  useQueryParamSync({
    key: 'm',
    value: selected,
    setValue: setSelected,
    parseFromQuery,
    serializeToQuery,
  });
  return { selected, setSelected };
};

describe('useQueryParamSync', () => {
  it('sincroniza estado hacia query string con replaceState', () => {
    window.history.replaceState(null, '', '/');
    const { result } = renderHook(() => useHarness(''));

    act(() => {
      result.current.setSelected('35');
    });

    expect(new URL(window.location.href).searchParams.get('m')).toBe('35');

    act(() => {
      result.current.setSelected('');
    });
    expect(new URL(window.location.href).searchParams.get('m')).toBeNull();
  });

  it('sincroniza query string hacia estado al recibir popstate', () => {
    window.history.replaceState(null, '', '/?m=34');
    const { result } = renderHook(() => useHarness('34'));

    window.history.pushState(null, '', '/?m=60');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.selected).toBe('60');

    window.history.pushState(null, '', '/?m=invalid');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.selected).toBe('');
  });
});
