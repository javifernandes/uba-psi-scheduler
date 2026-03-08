import { describe, expect, it, vi } from 'vitest';
import { wait } from './wait';

describe('wait', () => {
  it('resuelve luego del tiempo pedido', async () => {
    vi.useFakeTimers();
    const done = vi.fn();

    void wait(120).then(done);

    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(119);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    await Promise.resolve();
    expect(done).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });
});
