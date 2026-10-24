/** Browser localStorage keys for teacher layout preferences. */
export const TEACHER_LAYOUT_STORAGE_KEYS = {
  TASK_ANALYTICS: "etkan.teacher.task_analytics",
  /** Prefix; append `.${classId}` for the last class-detail tab. */
  CLASS_DETAIL_TAB: "etkan.teacher.class_detail_tab",
} as const;

export const TEACHER_LAYOUT_STORAGE_VALUES = {
  ON: "on",
  OFF: "off",
} as const;

/** Defaults when nothing is stored yet. */
export const TEACHER_LAYOUT_DEFAULTS = {
  taskAnalytics: true,
} as const;
