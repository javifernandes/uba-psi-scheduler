import { useCallback } from 'react';

type WaitForSelectorParams = {
  selector: string;
  timeoutMs?: number;
  pollMs?: number;
};

type WaitForAnySelectorParams = {
  selectors: string[];
  timeoutMs?: number;
  pollMs?: number;
};

const waitForMatch = ({
  selectors,
  timeoutMs,
  pollMs,
}: {
  selectors: string[];
  timeoutMs: number;
  pollMs: number;
}) => {
  if (typeof window === 'undefined') return Promise.resolve();
  return new Promise<void>(resolve => {
    const hasMatch = () => selectors.some(selector => window.document.querySelector(selector));

    if (hasMatch()) {
      resolve();
      return;
    }

    const startedAt = Date.now();
    const intervalId = window.setInterval(() => {
      const didTimeout = Date.now() - startedAt >= timeoutMs;
      if (hasMatch() || didTimeout) {
        window.clearInterval(intervalId);
        resolve();
      }
    }, pollMs);
  });
};

export const useWaitForSelector = () =>
  useCallback(({ selector, timeoutMs = 4500, pollMs = 80 }: WaitForSelectorParams) => {
    return waitForMatch({ selectors: [selector], timeoutMs, pollMs });
  }, []);

export const useWaitForAnySelector = () =>
  useCallback(({ selectors, timeoutMs = 7000, pollMs = 80 }: WaitForAnySelectorParams) => {
    return waitForMatch({ selectors, timeoutMs, pollMs });
  }, []);
