/** How many weeks ahead a class week can be skipped. */
export const SKIP_HORIZON_WEEKS = 4;

/** Teachers cannot create a run of more than this many skipped weeks in a row. */
export const TEACHER_MAX_CONSECUTIVE_SKIPS = 2;

/** Days before its start that the cron creates the next weekly session (matches the SQL default). */
export const AUTO_SESSION_LEAD_DAYS = 2;

export const CLASS_SESSION_SKIP_REASON_MAX_LENGTH = 300;

export const CLASS_WEEK_SKIP_BLOCKED_REASONS = {
  CONSECUTIVE_LIMIT: `Teachers can skip at most ${TEACHER_MAX_CONSECUTIVE_SKIPS} weeks in a row. Ask a manager to pause the class instead.`,
  SESSION_STARTED_WORK:
    "This session already has a report or attendance changes.",
  SESSION_ENDED: "This session has already ended.",
  NOT_LATEST_SESSION: "Only the latest session can be skipped.",
  GRADES_LOCKED: "Course grades are computed for this class.",
  CLASS_NOT_IN_PROGRESS: "Only in-progress classes can skip weeks.",
} as const;
