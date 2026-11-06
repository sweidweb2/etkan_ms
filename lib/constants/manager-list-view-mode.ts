/** Browser localStorage keys for manager lists that switch between table and grid. */
export const MANAGER_LIST_VIEW_MODE_STORAGE_KEYS = {
  ACCOUNTING_PHASES: "etkan:view:manager-accounting-phases",
  ACCOUNTING_SPP: "etkan:view:manager-accounting-spp",
} as const;

export type ManagerListViewModeStorageKey =
  (typeof MANAGER_LIST_VIEW_MODE_STORAGE_KEYS)[keyof typeof MANAGER_LIST_VIEW_MODE_STORAGE_KEYS];

export const MANAGER_LIST_VIEW_MODES = {
  TABLE: "table",
  GRID: "grid",
} as const;

export type ManagerListViewMode =
  (typeof MANAGER_LIST_VIEW_MODES)[keyof typeof MANAGER_LIST_VIEW_MODES];

const VIEW_MODE_VALUES = new Set<string>(Object.values(MANAGER_LIST_VIEW_MODES));

/** Last chosen layout for a list (browser only; null when missing/invalid). */
export function readManagerListViewMode(
  key: ManagerListViewModeStorageKey
): ManagerListViewMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value && VIEW_MODE_VALUES.has(value)
      ? (value as ManagerListViewMode)
      : null;
  } catch {
    return null;
  }
}

export function writeManagerListViewMode(
  key: ManagerListViewModeStorageKey,
  mode: ManagerListViewMode
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, mode);
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}
