import { Temporal } from "temporal-polyfill";

export const SPP_CLEARANCE_DURATION_DAYS_DEFAULT = 30;
export const SPP_CLEARANCE_DURATION_DAYS_MIN = 1;
export const SPP_CLEARANCE_DURATION_DAYS_MAX = 365;

/**
 * Instant when a clearance expires: created_at + duration_days (exact 24h days).
 */
export function getSppClearanceExpiresAt(
  createdAt: string,
  durationDays: number
): Temporal.Instant {
  const created = Temporal.Instant.from(createdAt);
  return created.add({ hours: durationDays * 24 });
}

/**
 * True while now is strictly before created_at + duration_days.
 * Exactly at expiry (and after) is inactive.
 */
export function isSppClearanceActive(
  createdAt: string,
  durationDays: number,
  now: Temporal.Instant = Temporal.Now.instant()
): boolean {
  if (
    !Number.isFinite(durationDays) ||
    durationDays < SPP_CLEARANCE_DURATION_DAYS_MIN
  ) {
    return false;
  }

  try {
    const expiresAt = getSppClearanceExpiresAt(createdAt, durationDays);
    return Temporal.Instant.compare(now, expiresAt) < 0;
  } catch {
    return false;
  }
}

export function getSppClearanceExpiresAtIso(
  createdAt: string,
  durationDays: number
): string {
  return getSppClearanceExpiresAt(createdAt, durationDays).toString();
}
