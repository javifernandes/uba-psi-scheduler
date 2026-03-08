export const wait = (ms: number) =>
  new Promise<void>(resolve => {
    if (typeof window === 'undefined') {
      setTimeout(resolve, ms);
      return;
    }
    window.setTimeout(resolve, ms);
  });
