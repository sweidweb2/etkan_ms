export const ACCOUNT_SPECIAL_CASE_TYPES = {
  SCHOLARSHIP: "scholarship",
  DONE: "done",
} as const;

export type AccountSpecialCaseTypeValue =
  (typeof ACCOUNT_SPECIAL_CASE_TYPES)[keyof typeof ACCOUNT_SPECIAL_CASE_TYPES];

export const ACCOUNT_SPECIAL_CASE_TYPE_VALUES = Object.values(
  ACCOUNT_SPECIAL_CASE_TYPES
) as [AccountSpecialCaseTypeValue, ...AccountSpecialCaseTypeValue[]];

export const ACCOUNT_SPECIAL_CASE_TYPE_LABELS: Record<
  AccountSpecialCaseTypeValue,
  string
> = {
  scholarship: "Scholarship",
  done: "Done",
};

export const ACCOUNT_SPECIAL_CASE_TYPE_BADGE_CLASSES: Record<
  AccountSpecialCaseTypeValue,
  string
> = {
  scholarship:
    "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  done: "bg-slate-500/15 text-slate-800 dark:text-slate-200",
};

export const ACCOUNT_SPECIAL_CASE_STATUSES = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

export type AccountSpecialCaseStatusValue =
  (typeof ACCOUNT_SPECIAL_CASE_STATUSES)[keyof typeof ACCOUNT_SPECIAL_CASE_STATUSES];

export const ACCOUNT_SPECIAL_CASE_STATUS_VALUES = Object.values(
  ACCOUNT_SPECIAL_CASE_STATUSES
) as [AccountSpecialCaseStatusValue, ...AccountSpecialCaseStatusValue[]];

export const ACCOUNT_SPECIAL_CASE_STATUS_LABELS: Record<
  AccountSpecialCaseStatusValue,
  string
> = {
  active: "Active",
  inactive: "Inactive",
};

export const ACCOUNT_SPECIAL_CASE_NO_MONEY_BADGE_CLASS =
  "bg-rose-500/15 text-rose-800 dark:text-rose-200";

/** Discount % from semester amount vs special-case total (0–100). */
export function computeSpecialCasePercentageDiscount(
  semesterAmount: number,
  totalAmount: number
): number {
  if (!(semesterAmount > 0)) {
    return 0;
  }

  const raw = (1 - totalAmount / semesterAmount) * 100;
  return Math.min(100, Math.max(0, Math.round(raw * 100) / 100));
}
