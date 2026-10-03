import { APP_TIMEZONE } from "@/lib/constants/timezone";

/** Current calendar month key (YYYY-MM) in Asia/Beirut. */
export function getCurrentIncomeStatementMonthKey(
  now: Date = new Date()
): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  if (!year || !month) {
    const fallbackYear = now.getFullYear();
    const fallbackMonth = String(now.getMonth() + 1).padStart(2, "0");
    return `${fallbackYear}-${fallbackMonth}`;
  }

  return `${year}-${month}`;
}

/**
 * True when `isoDate` (YYYY-MM-DD) falls in a calendar month before the
 * current Asia/Beirut month used by the income statement.
 */
export function isPastIncomeStatementMonth(
  isoDate: string,
  now: Date = new Date()
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return false;
  }

  return isoDate.slice(0, 7) < getCurrentIncomeStatementMonthKey(now);
}
