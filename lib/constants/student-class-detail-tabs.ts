export const STUDENT_CLASS_DETAIL_TABS = {
  DETAILS: "details",
  GRADES: "grades",
  TASKS: "tasks",
  TEAM_LEADER: "team-leader",
} as const;

export type StudentClassDetailTab =
  (typeof STUDENT_CLASS_DETAIL_TABS)[keyof typeof STUDENT_CLASS_DETAIL_TABS];

const TAB_VALUES = new Set<string>(Object.values(STUDENT_CLASS_DETAIL_TABS));

const STORAGE_KEY_PREFIX = "etkan.student.class_detail_tab";

export function parseStudentClassDetailTab(
  value: string | null | undefined
): StudentClassDetailTab | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return TAB_VALUES.has(normalized)
    ? (normalized as StudentClassDetailTab)
    : null;
}

/** Last opened tab for a class (browser only; null when missing/invalid). */
export function readStudentClassDetailTab(
  classId: string
): StudentClassDetailTab | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return parseStudentClassDetailTab(
      window.localStorage.getItem(`${STORAGE_KEY_PREFIX}.${classId}`)
    );
  } catch {
    return null;
  }
}

/** Remember the last opened tab for client-only restore (no URL navigation). */
export function writeStudentClassDetailTab(
  classId: string,
  tab: StudentClassDetailTab
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
