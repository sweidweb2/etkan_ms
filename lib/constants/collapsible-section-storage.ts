/**
 * localStorage keys for manager detail-page collapsible sections.
 * Values: `"open"` | `"closed"`.
 */
export const COLLAPSIBLE_SECTION_STORAGE_KEYS = {
  CLASS_DETAILS_INFO: "etkan:collapsible:class-details:info",
  CLASS_DETAILS_SESSIONS: "etkan:collapsible:class-details:sessions",
  CLASS_DETAILS_TASKS: "etkan:collapsible:class-details:tasks",
  CLASS_DETAILS_STUDENTS: "etkan:collapsible:class-details:students",
  CLASS_DETAILS_FINAL_EXAM: "etkan:collapsible:class-details:final-exam",
  CLASS_DETAILS_SESSION_PROGRESS:
    "etkan:collapsible:class-details:session-progress",
  CLASS_DETAILS_ANALYTICS: "etkan:collapsible:class-details:analytics",
  INCOME_ANALYTICS_STUDENTS_PAYMENTS:
    "etkan:collapsible:income-analytics:students-payments",
  INCOME_ANALYTICS_STUDENTS_UNPAID:
    "etkan:collapsible:income-analytics:students-unpaid",
  INCOME_ANALYTICS_STUDENTS_ADJUSTMENTS:
    "etkan:collapsible:income-analytics:students-adjustments",
  CLASSES_STUDENTS_WITHOUT_ACTIVE_CLASS:
    "etkan:collapsible:classes:students-without-active-class",
  STUDENT_DETAILS_ACTIVITY: "etkan:collapsible:student-details:activity:v2",
  STUDENT_DETAILS_BORROWING: "etkan:collapsible:student-details:borrowing",
} as const;
