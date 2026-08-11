import { Temporal } from "temporal-polyfill";
import { APP_TIMEZONE } from "@/lib/constants/timezone";

/** Today's date/time as datetime-local in the caller's browser timezone (defaults). */
export function toDateTimeLocalValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

/**
 * Format a stored UTC/ISO instant as datetime-local wall time in the school
 * timezone (Asia/Beirut), so edit forms match what managers entered.
 */
export function toSchoolDateTimeLocalValue(iso: string | null | undefined) {
  if (!iso?.trim()) {
    return "";
  }

  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) {
    return "";
  }

  const zoned = Temporal.Instant.fromEpochMilliseconds(ms).toZonedDateTimeISO(
    APP_TIMEZONE
  );
  const year = String(zoned.year).padStart(4, "0");
  const month = String(zoned.month).padStart(2, "0");
  const day = String(zoned.day).padStart(2, "0");
  const hour = String(zoned.hour).padStart(2, "0");
  const minute = String(zoned.minute).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
