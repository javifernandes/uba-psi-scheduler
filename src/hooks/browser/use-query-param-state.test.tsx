import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { useQueryParamState } from './use-query-param-state';

type TestValue = { selected: string };

const useHarness = (initialValue: TestValue = { selected: '' }) => {
  const [state, setState] = React.useState(initialValue);
  useQueryParamState({
    key: 'm',
    value: state.selected,
    setValue: value =>
      setState(prev => ({
        ...prev,
        selected: typeof value === 'function' ? value(prev.selected) : value,
      })),
    parseFromQuery: raw => (raw && raw !== 'invalid' ? raw : ''),
    serializeToQuery: value => (value ? value : null),
  });
  return { state, setState };
};

describe('useQueryParamState', () => {
  it('sincroniza estado hacia query string con replaceState', () => {
    window.history.replaceState(null, '', '/');
    const { result } = renderHook(() => useHarness({ selected: '' }));

    act(() => {
      result.current.setState({ selected: '35' });
    });

    expect(new URL(window.location.href).searchParams.get('m')).toBe('35');

    act(() => {
      result.current.setState({ selected: '' });
    });
    expect(new URL(window.location.href).searchParams.get('m')).toBeNull();
  });

  it('sincroniza query string hacia estado al recibir popstate', () => {
    window.history.replaceState(null, '', '/?m=34');
    const { result } = renderHook(() => useHarness({ selected: '34' }));

    window.history.pushState(null, '', '/?m=60');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.state.selected).toBe('60');

    window.history.pushState(null, '', '/?m=invalid');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.state.selected).toBe('');
  });
});
