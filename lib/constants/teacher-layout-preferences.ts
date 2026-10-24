/** Browser localStorage keys for teacher layout preferences. */
export const TEACHER_LAYOUT_STORAGE_KEYS = {
  /** Grade summary cards on the class Tasks tab. */
  TASK_ANALYTICS: "etkan.teacher.task_analytics",
  /** Charts section on a task details page. */
  TASK_DETAIL_ANALYTICS: "etkan.teacher.task_detail_analytics",
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
  taskDetailAnalytics: true,
} as const;
