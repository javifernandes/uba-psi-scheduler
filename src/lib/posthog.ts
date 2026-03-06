import posthog from 'posthog-js';

export const isPosthogEnabled = () =>
  typeof window !== 'undefined' && Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY);

export const captureEvent = (event: string, properties?: Record<string, unknown>) => {
  if (!isPosthogEnabled()) return;
  posthog.capture(event, properties);
};
