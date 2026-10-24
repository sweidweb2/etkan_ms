/** Browser localStorage keys for teacher layout preferences. */
export const TEACHER_LAYOUT_STORAGE_KEYS = {
  TASK_ANALYTICS: "etkan.teacher.task_analytics",
} as const;

export const TEACHER_LAYOUT_STORAGE_VALUES = {
  ON: "on",
  OFF: "off",
} as const;

/** Defaults when nothing is stored yet. */
export const TEACHER_LAYOUT_DEFAULTS = {
  taskAnalytics: true,
} as const;
