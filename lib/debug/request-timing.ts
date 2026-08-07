import { cache } from "react";

/**
 * Dev request timing — set ETKAN_DEBUG_TIMING=1 to force on, =0 to force off.
 * Default: on in development.
 */
export function isRequestTimingEnabled(): boolean {
  if (process.env.ETKAN_DEBUG_TIMING === "0") {
    return false;
  }
  if (process.env.ETKAN_DEBUG_TIMING === "1") {
    return true;
  }
  return process.env.NODE_ENV === "development";
}

type TimingMark = {
  label: string;
  atMs: number;
  sinceStartMs: number;
  sincePrevMs: number;
};

type TimingState = {
  id: string;
  startMs: number;
  lastMs: number;
  marks: TimingMark[];
};

const getTimingState = cache((): TimingState | null => {
  if (!isRequestTimingEnabled()) {
    return null;
  }
  const now = performance.now();
  return {
    id: crypto.randomUUID().slice(0, 8),
    startMs: now,
    lastMs: now,
    marks: [],
  };
});

function formatMs(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}

/** Record a checkpoint. Safe no-op when timing is disabled. */
export function timingMark(label: string): void {
  const state = getTimingState();
  if (!state) {
    return;
  }

  const now = performance.now();
  const mark: TimingMark = {
    label,
    atMs: now,
    sinceStartMs: now - state.startMs,
    sincePrevMs: now - state.lastMs,
  };
  state.marks.push(mark);
  state.lastMs = now;

  console.info(
    `[etkan:timing ${state.id}] +${formatMs(mark.sincePrevMs)} (Σ${formatMs(mark.sinceStartMs)}) ${label}`
  );
}

/** Time an async block and mark start/end. */
export async function timingAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  timingMark(`${label}:start`);
  try {
    return await fn();
  } finally {
    timingMark(`${label}:end`);
  }
}

export type TimingReport = {
  id: string;
  totalMs: number;
  marks: TimingMark[];
  lines: string[];
};

/** Snapshot for on-page debug UI (call after work finishes). */
export function getTimingReport(): TimingReport | null {
  const state = getTimingState();
  if (!state || state.marks.length === 0) {
    return null;
  }

  const totalMs = performance.now() - state.startMs;
  const lines = [
    `request ${state.id} — total ${formatMs(totalMs)}`,
    ...state.marks.map(
      (m) =>
        `  +${formatMs(m.sincePrevMs).padStart(7)}  Σ${formatMs(m.sinceStartMs).padStart(7)}  ${m.label}`
    ),
  ];

  return {
    id: state.id,
    totalMs,
    marks: [...state.marks],
    lines,
  };
}
