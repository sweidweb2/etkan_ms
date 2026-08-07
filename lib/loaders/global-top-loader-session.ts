export type GlobalTopLoaderSnapshot = {
  progress: number;
  visible: boolean;
};

export type GlobalTopLoaderToken = number;

type Listener = () => void;

type TimerHandle = ReturnType<typeof setTimeout>;
type IntervalHandle = ReturnType<typeof setInterval>;

type TimerApi = {
  setTimeout: (fn: () => void, ms: number) => TimerHandle;
  clearTimeout: (id: TimerHandle | null | undefined) => void;
  setInterval: (fn: () => void, ms: number) => IntervalHandle;
  clearInterval: (id: IntervalHandle | null | undefined) => void;
  now: () => number;
  random: () => number;
};

const SHOW_DELAY_MS = 50;
const START_PROGRESS = 18;
const TRICKLE_MAX = 92;
const TRICKLE_MS = 320;
const COMPLETE_HOLD_MS = 200;
const FADE_RESET_MS = 180;
const STUCK_ABORT_MS = 60_000;

const defaultTimers: TimerApi = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => {
    if (id != null) clearTimeout(id);
  },
  setInterval: (fn, ms) => setInterval(fn, ms),
  clearInterval: (id) => {
    if (id != null) clearInterval(id);
  },
  now: () => Date.now(),
  random: () => Math.random(),
};

function clampProgress(value: number) {
  return Math.max(0, Math.min(100, value));
}

/**
 * Ref-counted global progress session for navigation / RSC / server actions.
 * Progress only moves forward; 100% only after pendingCount hits 0.
 */
export function createGlobalTopLoaderSession(timers: TimerApi = defaultTimers) {
  let pendingCount = 0;
  let nextToken = 1;
  const activeTokens = new Set<GlobalTopLoaderToken>();

  let progress = 0;
  let visible = false;
  let sessionActive = false;

  let showDelayTimer: TimerHandle | null = null;
  let trickleTimer: IntervalHandle | null = null;
  let completeHoldTimer: TimerHandle | null = null;
  let fadeResetTimer: TimerHandle | null = null;
  let stuckTimer: TimerHandle | null = null;

  const listeners = new Set<Listener>();

  // Cached for useSyncExternalStore — must be referentially stable when unchanged.
  let snapshot: GlobalTopLoaderSnapshot = { progress: 0, visible: false };

  const emit = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  const getSnapshot = (): GlobalTopLoaderSnapshot => snapshot;

  const setState = (next: Partial<GlobalTopLoaderSnapshot>) => {
    let changed = false;
    if (next.progress != null && next.progress !== progress) {
      progress = clampProgress(next.progress);
      changed = true;
    }
    if (next.visible != null && next.visible !== visible) {
      visible = next.visible;
      changed = true;
    }
    if (changed) {
      snapshot = { progress, visible };
      emit();
    }
  };

  const clearShowDelay = () => {
    timers.clearTimeout(showDelayTimer);
    showDelayTimer = null;
  };

  const clearTrickle = () => {
    timers.clearInterval(trickleTimer);
    trickleTimer = null;
  };

  const clearCompleteHold = () => {
    timers.clearTimeout(completeHoldTimer);
    completeHoldTimer = null;
  };

  const clearFadeReset = () => {
    timers.clearTimeout(fadeResetTimer);
    fadeResetTimer = null;
  };

  const clearStuck = () => {
    timers.clearTimeout(stuckTimer);
    stuckTimer = null;
  };

  const clearAllTimers = () => {
    clearShowDelay();
    clearTrickle();
    clearCompleteHold();
    clearFadeReset();
    clearStuck();
  };

  const startTrickle = () => {
    clearTrickle();
    trickleTimer = timers.setInterval(() => {
      if (pendingCount <= 0) return;
      if (progress >= TRICKLE_MAX) return;
      const remaining = TRICKLE_MAX - progress;
      const base = Math.max(0.35, remaining * 0.07);
      const jitter = timers.random() * 0.9;
      setState({ progress: Math.min(TRICKLE_MAX, progress + base + jitter) });
    }, TRICKLE_MS);
  };

  const armStuckAbort = () => {
    clearStuck();
    stuckTimer = timers.setTimeout(() => {
      if (pendingCount > 0) return;
      // Orphaned arm (click never produced tracked network) — reset quietly.
      resetSession();
    }, STUCK_ABORT_MS);
  };

  const resetSession = () => {
    clearAllTimers();
    sessionActive = false;
    pendingCount = 0;
    activeTokens.clear();
    setState({ progress: 0, visible: false });
  };

  const openSession = () => {
    clearCompleteHold();
    clearFadeReset();
    sessionActive = true;

    if (visible) {
      // Continue existing bar; never restart from 0.
      if (progress < START_PROGRESS) {
        setState({ progress: START_PROGRESS });
      }
      startTrickle();
      return;
    }

    clearShowDelay();
    showDelayTimer = timers.setTimeout(() => {
      showDelayTimer = null;
      if (!sessionActive || pendingCount <= 0) return;
      setState({ visible: true, progress: Math.max(progress, START_PROGRESS) });
      startTrickle();
    }, SHOW_DELAY_MS);
  };

  const finishSession = () => {
    clearShowDelay();
    clearTrickle();
    clearStuck();

    if (!visible && progress === 0) {
      resetSession();
      return;
    }

    setState({ visible: true, progress: 100 });

    clearCompleteHold();
    completeHoldTimer = timers.setTimeout(() => {
      completeHoldTimer = null;
      setState({ visible: false });
      clearFadeReset();
      fadeResetTimer = timers.setTimeout(() => {
        fadeResetTimer = null;
        sessionActive = false;
        setState({ progress: 0 });
      }, FADE_RESET_MS);
    }, COMPLETE_HOLD_MS);
  };

  const start = (): GlobalTopLoaderToken => {
    const token = nextToken++;
    activeTokens.add(token);
    const wasIdle = pendingCount === 0;
    pendingCount += 1;

    if (wasIdle) {
      openSession();
    } else if (sessionActive) {
      // Overlapping op — keep trickle, cancel any finish-in-progress.
      clearCompleteHold();
      clearFadeReset();
      if (visible && progress >= 100) {
        setState({ progress: TRICKLE_MAX });
      }
      startTrickle();
    }

    armStuckAbort();
    return token;
  };

  const end = (token: GlobalTopLoaderToken) => {
    if (!activeTokens.has(token)) return;
    activeTokens.delete(token);
    pendingCount = Math.max(0, pendingCount - 1);

    if (pendingCount > 0) {
      armStuckAbort();
      return;
    }

    finishSession();
  };

  const trackAsync = async <T>(promise: Promise<T>): Promise<T> => {
    const token = start();
    try {
      return await promise;
    } finally {
      end(token);
    }
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  /** Test / debug reset. */
  const __reset = () => {
    resetSession();
  };

  const __getPendingCount = () => pendingCount;

  return {
    start,
    end,
    trackAsync,
    subscribe,
    getSnapshot,
    __reset,
    __getPendingCount,
  };
}

export type GlobalTopLoaderSession = ReturnType<
  typeof createGlobalTopLoaderSession
>;

/** App-wide singleton used by RouteTopLoader bindings. */
export const globalTopLoaderSession = createGlobalTopLoaderSession();
