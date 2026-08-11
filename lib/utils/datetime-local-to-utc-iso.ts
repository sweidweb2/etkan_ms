import { Temporal } from "temporal-polyfill";
import { APP_TIMEZONE } from "@/lib/constants/timezone";

const HAS_TIMEZONE_SUFFIX = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

/**
 * Convert a datetime-local string (no offset) to a UTC ISO instant,
 * interpreting the wall clock as {@link APP_TIMEZONE} (Asia/Beirut).
 *
 * Values that already include `Z` or an offset are treated as absolute instants.
 */
export function datetimeLocalToUtcIso(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (HAS_TIMEZONE_SUFFIX.test(trimmed)) {
      return Temporal.Instant.from(trimmed).toString();
    }

    const normalized = trimmed.includes("T")
      ? trimmed
      : trimmed.replace(" ", "T");
    const plain = Temporal.PlainDateTime.from(normalized);
    return plain.toZonedDateTime(APP_TIMEZONE).toInstant().toString();
  } catch {
    return null;
  }
}
