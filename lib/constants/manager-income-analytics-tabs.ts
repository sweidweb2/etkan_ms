/** Browser localStorage key for the manager income analytics body tabs. */
export const MANAGER_INCOME_ANALYTICS_TAB_STORAGE_KEY =
  "etkan:tabs:manager-income-analytics";

export const MANAGER_INCOME_ANALYTICS_TABS = {
  NONE: "none",
  GENERAL: "general",
  ETKAN: "etkan",
  ACADEMY: "academy",
} as const;

export type ManagerIncomeAnalyticsTab =
  (typeof MANAGER_INCOME_ANALYTICS_TABS)[keyof typeof MANAGER_INCOME_ANALYTICS_TABS];

const TAB_VALUES = new Set<string>(Object.values(MANAGER_INCOME_ANALYTICS_TABS));

/** Last opened income analytics tab (browser only; null when missing/invalid). */
export function readManagerIncomeAnalyticsTab(): ManagerIncomeAnalyticsTab | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(
      MANAGER_INCOME_ANALYTICS_TAB_STORAGE_KEY
    );
    return value && TAB_VALUES.has(value)
      ? (value as ManagerIncomeAnalyticsTab)
      : null;
  } catch {
    return null;
  }
}

export function writeManagerIncomeAnalyticsTab(tab: ManagerIncomeAnalyticsTab) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(MANAGER_INCOME_ANALYTICS_TAB_STORAGE_KEY, tab);
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}
