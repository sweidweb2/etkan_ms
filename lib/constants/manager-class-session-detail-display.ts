/** Maps to `attendee.status` in the database (true = present, false = absent). */
export const SESSION_ATTENDEE_STATUS_LABELS = {
  present: "Present",
  absent: "Absent",
} as const;

export const SESSION_TASK_TABLE_LIMITS = {
  title: 48,
  description: 64,
} as const;

export const SESSION_ATTENDEE_TABLE_LIMITS = {
  fullName: 32,
  email: 40,
  note: 40,
} as const;

export const SESSION_STUDENT_TASK_TABLE_LIMITS = {
  fullName: 32,
  notes: 48,
} as const;
