/** Browser localStorage keys for the manager Accounting page tabs. */
export const MANAGER_ACCOUNTING_TAB_STORAGE_KEYS = {
  PAGE: "etkan:tabs:manager-accounting",
  EXCEPTIONS: "etkan:tabs:manager-accounting:exceptions",
} as const;

export const MANAGER_ACCOUNTING_TABS = {
  PHASES: "phases",
  TIMELINE: "timeline",
  MISSING_PRIOR: "missing-prior",
  EXCEPTIONS: "exceptions",
} as const;

export type ManagerAccountingTab =
  (typeof MANAGER_ACCOUNTING_TABS)[keyof typeof MANAGER_ACCOUNTING_TABS];

export const MANAGER_ACCOUNTING_EXCEPTION_TABS = {
  BILLED_NO_CLASS: "billed-no-class",
  NO_CLASS_NO_PHASE: "no-class-no-phase",
  SEMESTER_MISMATCH: "semester-mismatch",
  IN_CLASS_NO_PHASE: "in-class-no-phase",
  NEED_REFUND: "need-refund",
} as const;

export type ManagerAccountingExceptionTab =
  (typeof MANAGER_ACCOUNTING_EXCEPTION_TABS)[keyof typeof MANAGER_ACCOUNTING_EXCEPTION_TABS];

const PAGE_TAB_VALUES = new Set<string>(Object.values(MANAGER_ACCOUNTING_TABS));
const EXCEPTION_TAB_VALUES = new Set<string>(
  Object.values(MANAGER_ACCOUNTING_EXCEPTION_TABS)
);

function readStoredTab<T extends string>(
  key: string,
  allowed: Set<string>
): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value && allowed.has(value) ? (value as T) : null;
  } catch {
    return null;
  }
}

function writeStoredTab(key: string, tab: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, tab);
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}

/** Last opened Accounting page tab (browser only; null when missing/invalid). */
export function readManagerAccountingTab(): ManagerAccountingTab | null {
  return readStoredTab<ManagerAccountingTab>(
    MANAGER_ACCOUNTING_TAB_STORAGE_KEYS.PAGE,
    PAGE_TAB_VALUES
  );
}

export function writeManagerAccountingTab(tab: ManagerAccountingTab) {
  writeStoredTab(MANAGER_ACCOUNTING_TAB_STORAGE_KEYS.PAGE, tab);
}

/** Last opened Exceptions sub-tab (browser only; null when missing/invalid). */
export function readManagerAccountingExceptionTab(): ManagerAccountingExceptionTab | null {
  return readStoredTab<ManagerAccountingExceptionTab>(
    MANAGER_ACCOUNTING_TAB_STORAGE_KEYS.EXCEPTIONS,
    EXCEPTION_TAB_VALUES
  );
}

export function writeManagerAccountingExceptionTab(
  tab: ManagerAccountingExceptionTab
) {
  writeStoredTab(MANAGER_ACCOUNTING_TAB_STORAGE_KEYS.EXCEPTIONS, tab);
}
