type AfterTask = () => void | Promise<void>;

type AfterScheduler = (task: AfterTask) => void;

let afterScheduler: AfterScheduler | null | undefined;

function resolveAfterScheduler(): AfterScheduler | null {
  if (afterScheduler !== undefined) {
    return afterScheduler;
  }

  try {
    // Vitest and other non-Next runtimes do not provide `after`.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nextServer = require("next/server") as { after?: AfterScheduler };
    afterScheduler =
      typeof nextServer.after === "function" ? nextServer.after : null;
  } catch {
    afterScheduler = null;
  }

  return afterScheduler;
}

/** Test hook to force synchronous or custom deferred scheduling. */
export function __setAfterSchedulerForTests(
  scheduler: AfterScheduler | null
): void {
  afterScheduler = scheduler;
}

export function __resetAfterSchedulerForTests(): void {
  afterScheduler = undefined;
}

/**
 * Schedules work to run after the response is sent (Next.js `after`).
 * Returns true when deferred; false when the caller should run work inline.
 */
export function scheduleAfterResponse(task: AfterTask): boolean {
  const scheduler = resolveAfterScheduler();
  if (!scheduler) {
    return false;
  }

  try {
    scheduler(() => {
      void Promise.resolve(task()).catch((error: unknown) => {
        console.error("[audit] deferred task failed", error);
      });
    });
    return true;
  } catch {
    // Next.js `after()` throws outside a request scope (e.g. Vitest).
    return false;
  }
}
