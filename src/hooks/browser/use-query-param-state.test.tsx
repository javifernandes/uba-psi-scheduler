import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useQueryParamState } from './use-query-param-state';

describe('useQueryParamState', () => {
  it('inicializa desde URL y aplica init', () => {
    window.history.replaceState(null, '', '/?m=35');

    const { result } = renderHook(() =>
      useQueryParamState({
        key: 'm',
        parseFromQuery: raw => raw || '',
        init: value => (value === '35' ? value : ''),
        serializeToQuery: value => (value ? value : null),
      })
    );

    expect(result.current[0]).toBe('35');
  });

  it('sincroniza setState hacia query string', () => {
    window.history.replaceState(null, '', '/');

    const { result } = renderHook(() =>
      useQueryParamState({
        key: 'm',
        parseFromQuery: raw => raw || '',
        serializeToQuery: value => (value ? value : null),
      })
    );

    act(() => {
      result.current[1]('60');
    });

    expect(new URL(window.location.href).searchParams.get('m')).toBe('60');
  });

  it('sincroniza popstate hacia estado', () => {
    window.history.replaceState(null, '', '/?m=34');

    const { result } = renderHook(() =>
      useQueryParamState({
        key: 'm',
        parseFromQuery: raw => raw || '',
        serializeToQuery: value => (value ? value : null),
      })
    );

    window.history.pushState(null, '', '/?m=99');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current[0]).toBe('99');
  });
});
