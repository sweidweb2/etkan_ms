/**
 * Small process-local async semaphore.
 * Limits how many callers run heavy work at once without changing UX
 * (callers still await the same sync path; they queue under load).
 */

export type AsyncSemaphore = {
  readonly limit: number;
  run<T>(fn: () => Promise<T>): Promise<T>;
};

export function createAsyncSemaphore(limit: number): AsyncSemaphore {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Async semaphore limit must be an integer >= 1.");
  }

  let active = 0;
  const waiters: Array<() => void> = [];

  async function acquire(): Promise<void> {
    if (active < limit) {
      active += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      waiters.push(resolve);
    });
    active += 1;
  }

  function release(): void {
    active -= 1;
    const next = waiters.shift();
    if (next) {
      next();
    }
  }

  return {
    limit,
    async run<T>(fn: () => Promise<T>): Promise<T> {
      await acquire();
      try {
        return await fn();
      } finally {
        release();
      }
    },
  };
}
