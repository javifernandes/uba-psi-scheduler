import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useWaitForAnySelector, useWaitForSelector } from './use-wait-for-selector';

describe('useWaitForSelector', () => {
  it('resuelve cuando aparece el selector', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWaitForSelector());
    const done = vi.fn();

    void result.current({ selector: '[data-test="alpha"]', timeoutMs: 200, pollMs: 20 }).then(done);

    vi.advanceTimersByTime(60);
    expect(done).not.toHaveBeenCalled();

    const node = document.createElement('div');
    node.setAttribute('data-test', 'alpha');
    document.body.appendChild(node);

    vi.advanceTimersByTime(30);
    await Promise.resolve();
    expect(done).toHaveBeenCalledTimes(1);

    node.remove();
    vi.useRealTimers();
  });
});

describe('useWaitForAnySelector', () => {
  it('resuelve cuando aparece cualquiera de los selectores', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useWaitForAnySelector());
    const done = vi.fn();

    void result
      .current({ selectors: ['[data-test="a"]', '[data-test="b"]'], timeoutMs: 220, pollMs: 20 })
      .then(done);

    vi.advanceTimersByTime(80);
    expect(done).not.toHaveBeenCalled();

    const node = document.createElement('div');
    node.setAttribute('data-test', 'b');
    document.body.appendChild(node);

    vi.advanceTimersByTime(40);
    await Promise.resolve();
    expect(done).toHaveBeenCalledTimes(1);

    node.remove();
    vi.useRealTimers();
  });
});
