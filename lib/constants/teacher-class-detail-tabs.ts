import { TEACHER_LAYOUT_STORAGE_KEYS } from "@/lib/constants/teacher-layout-preferences";

export const TEACHER_CLASS_DETAIL_TABS = {
  MAIN: "main",
  SESSIONS: "sessions",
  TASKS: "tasks",
  ANALYTICS: "analytics",
} as const;

export type TeacherClassDetailTab =
  (typeof TEACHER_CLASS_DETAIL_TABS)[keyof typeof TEACHER_CLASS_DETAIL_TABS];

const TAB_VALUES = new Set<string>(Object.values(TEACHER_CLASS_DETAIL_TABS));

/** Parse a tab id (legacy `?tab=` bookmarks or localStorage). */
export function parseTeacherClassDetailTab(
  value: string | null | undefined
): TeacherClassDetailTab | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!TAB_VALUES.has(normalized)) {
    return null;
  }

  return normalized as TeacherClassDetailTab;
}

function classDetailTabStorageKey(classId: string) {
  return `${TEACHER_LAYOUT_STORAGE_KEYS.CLASS_DETAIL_TAB}.${classId}`;
}

/** Last opened tab for a class (browser only; null when missing/invalid). */
export function readTeacherClassDetailTab(
  classId: string
): TeacherClassDetailTab | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return parseTeacherClassDetailTab(
      window.localStorage.getItem(classDetailTabStorageKey(classId))
    );
  } catch {
    return null;
  }
}

/** Remember the last opened tab for client-only restore (no URL navigation). */
export function writeTeacherClassDetailTab(
  classId: string,
  tab: TeacherClassDetailTab
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(classDetailTabStorageKey(classId), tab);
  } catch {
    // Ignore quota / privacy-mode failures.
  }
}
