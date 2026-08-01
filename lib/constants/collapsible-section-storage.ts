/**
 * localStorage keys for manager detail-page collapsible sections.
 * Values: `"open"` | `"closed"`.
 */
export const COLLAPSIBLE_SECTION_STORAGE_KEYS = {
  CLASS_DETAILS_INFO: "etkan:collapsible:class-details:info",
  CLASS_DETAILS_SESSIONS: "etkan:collapsible:class-details:sessions",
  CLASS_DETAILS_STUDENTS: "etkan:collapsible:class-details:students",
  CLASS_DETAILS_FINAL_EXAM: "etkan:collapsible:class-details:final-exam",
  CLASS_DETAILS_SESSION_PROGRESS:
    "etkan:collapsible:class-details:session-progress",
  CLASS_DETAILS_ANALYTICS: "etkan:collapsible:class-details:analytics",
  SESSION_DETAILS_INFO: "etkan:collapsible:session-details:info",
  SESSION_DETAILS_SETTINGS: "etkan:collapsible:session-details:settings",
  SESSION_DETAILS_TASKS_ATTENDEE:
    "etkan:collapsible:session-details:tasks-attendee",
  ACCOUNTING_OVERVIEW: "etkan:collapsible:accounting:overview",
  ACCOUNTING_PAYMENT_PHASES: "etkan:collapsible:accounting:payment-phases",
  ACCOUNTING_MISSING_SPP: "etkan:collapsible:accounting:missing-spp",
  ACCOUNTING_STUDENTS_WITHOUT_ACTIVE_CLASS:
    "etkan:collapsible:accounting:students-without-active-class",
  CLASSES_STUDENTS_WITHOUT_ACTIVE_CLASS:
    "etkan:collapsible:classes:students-without-active-class",
} as const;
