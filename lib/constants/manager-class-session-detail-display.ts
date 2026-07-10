export { SESSION_ATTENDEE_STATUS_LABELS } from "@/lib/constants/manager-attendee-status";

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
