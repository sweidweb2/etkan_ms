import {
  CLASS_WEEK_SKIP_BLOCKED_REASONS,
  SKIP_HORIZON_WEEKS,
  TEACHER_MAX_CONSECUTIVE_SKIPS,
} from "@/lib/constants/class-session-skips";
import { APP_TIMEZONE } from "@/lib/constants/timezone";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_SLOT_SCAN = 120;

/** A future weekly slot that has no session yet. */
export type ClassWeekSlot = {
  /** YYYY-MM-DD in Asia/Beirut — the skip key. */
  date: string;
  startsAt: string;
  skipped: boolean;
  skipReason: string | null;
  canSkip: boolean;
  canUnskip: boolean;
  blockedReason: string | null;
};

/** Skip availability for the latest (pre-created or running) session. */
export type LatestSessionSkip = {
  sessionId: string;
  date: string;
  canSkip: boolean;
  blockedReason: string | null;
};

export type ClassWeekSkipState = {
  weeks: ClassWeekSlot[];
  latestSession: LatestSessionSkip | null;
};

export const EMPTY_CLASS_WEEK_SKIP_STATE: ClassWeekSkipState = {
  weeks: [],
  latestSession: null,
};

export type BuildClassWeekSkipStateInput = {
  now: Date;
  isTeacher: boolean;
  classInProgress: boolean;
  hasComputedGrades: boolean;
  /** Subject `nb_sessions`; null or 0 means no cap. */
  plannedSessions: number | null;
  sessions: ReadonlyArray<{
    id: string;
    starts_at: string;
    ends_at: string;
    session_report: string | null;
  }>;
  skips: ReadonlyArray<{ skip_date: string; reason: string | null }>;
  latestSessionHasAttendanceChanges: boolean;
};

/** YYYY-MM-DD for `date` in the app timezone (Asia/Beirut). */
export function toAppIsoDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Length of the skipped run that `date` would join (including `date`). */
export function countConsecutiveSkippedWeeks(
  date: string,
  skippedDates: ReadonlySet<string>
): number {
  let count = 1;

  for (let cursor = addDaysToIsoDate(date, -7); skippedDates.has(cursor); ) {
    count += 1;
    cursor = addDaysToIsoDate(cursor, -7);
  }

  for (let cursor = addDaysToIsoDate(date, 7); skippedDates.has(cursor); ) {
    count += 1;
    cursor = addDaysToIsoDate(cursor, 7);
  }

  return count;
}

export function buildClassWeekSkipState(
  input: BuildClassWeekSkipStateInput
): ClassWeekSkipState {
  if (
    !input.classInProgress ||
    input.hasComputedGrades ||
    input.sessions.length === 0
  ) {
    return EMPTY_CLASS_WEEK_SKIP_STATE;
  }

  const nowMs = input.now.getTime();
  const today = toAppIsoDate(input.now);
  const skipReasons = new Map(
    input.skips.map((skip) => [skip.skip_date, skip.reason])
  );
  const skippedDates = new Set(skipReasons.keys());

  const latest = input.sessions.reduce((current, session) =>
    new Date(session.starts_at).getTime() > new Date(current.starts_at).getTime()
      ? session
      : current
  );

  const consecutiveBlocked = (date: string) =>
    input.isTeacher &&
    countConsecutiveSkippedWeeks(date, skippedDates) >
      TEACHER_MAX_CONSECUTIVE_SKIPS;

  let latestSession: LatestSessionSkip | null = null;

  if (new Date(latest.ends_at).getTime() > nowMs) {
    const date = toAppIsoDate(new Date(latest.starts_at));
    let blockedReason: string | null = null;

    if (latest.session_report?.trim() || input.latestSessionHasAttendanceChanges) {
      blockedReason = CLASS_WEEK_SKIP_BLOCKED_REASONS.SESSION_STARTED_WORK;
    } else if (consecutiveBlocked(date)) {
      blockedReason = CLASS_WEEK_SKIP_BLOCKED_REASONS.CONSECUTIVE_LIMIT;
    }

    latestSession = {
      sessionId: latest.id,
      date,
      canSkip: blockedReason === null,
      blockedReason,
    };
  }

  const plannedSessions = input.plannedSessions ?? 0;
  let remainingSessions =
    plannedSessions > 0
      ? plannedSessions - input.sessions.length
      : Number.POSITIVE_INFINITY;

  const horizonEnd = addDaysToIsoDate(today, SKIP_HORIZON_WEEKS * 7);
  const anchorMs = new Date(latest.starts_at).getTime();
  const weeks: ClassWeekSlot[] = [];

  for (
    let step = 1;
    step <= MAX_SLOT_SCAN && remainingSessions > 0;
    step += 1
  ) {
    const startsAt = new Date(anchorMs + step * WEEK_MS);
    const date = toAppIsoDate(startsAt);

    if (date < today) {
      continue;
    }

    if (date > horizonEnd) {
      break;
    }

    const skipped = skippedDates.has(date);
    const blocked = !skipped && consecutiveBlocked(date);

    weeks.push({
      date,
      startsAt: startsAt.toISOString(),
      skipped,
      skipReason: skipped ? (skipReasons.get(date) ?? null) : null,
      canSkip: !skipped && !blocked,
      canUnskip: skipped,
      blockedReason: blocked
        ? CLASS_WEEK_SKIP_BLOCKED_REASONS.CONSECUTIVE_LIMIT
        : null,
    });

    if (!skipped) {
      remainingSessions -= 1;
    }
  }

  return { weeks, latestSession };
}
