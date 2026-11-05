export const MANAGER_CLASS_DETAIL_TABS = {
  SESSIONS: "sessions",
  TASKS: "tasks",
  STUDENTS: "students",
  GENERAL: "general",
  FINAL_EXAM: "final-exam",
  PROGRESS: "progress",
  ANALYTICS: "analytics",
} as const;

export type ManagerClassDetailTab =
  (typeof MANAGER_CLASS_DETAIL_TABS)[keyof typeof MANAGER_CLASS_DETAIL_TABS];

const TAB_VALUES = new Set<string>(Object.values(MANAGER_CLASS_DETAIL_TABS));

const STORAGE_KEY_PREFIX = "etkan.manager.class_detail_tab";

export function parseManagerClassDetailTab(
  value: string | null | undefined
): ManagerClassDetailTab | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return TAB_VALUES.has(normalized)
    ? (normalized as ManagerClassDetailTab)
    : null;
}

/** Last opened tab for a class (browser only; null when missing/invalid). */
export function readManagerClassDetailTab(
  classId: string
): ManagerClassDetailTab | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return parseManagerClassDetailTab(
      window.localStorage.getItem(`${STORAGE_KEY_PREFIX}.${classId}`)
    );
  } catch {
    return null;
  }
}

export function writeManagerClassDetailTab(
  classId: string,
  tab: ManagerClassDetailTab
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(`${STORAGE_KEY_PREFIX}.${classId}`, tab);
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}
