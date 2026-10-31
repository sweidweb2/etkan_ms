/** Maps to `attendee.status` in the database. */
export const ATTENDEE_STATUSES = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late",
  EXCUSED: "excused",
} as const;

export type AttendeeStatusValue =
  (typeof ATTENDEE_STATUSES)[keyof typeof ATTENDEE_STATUSES];

export const ATTENDEE_STATUS_VALUES = [
  ATTENDEE_STATUSES.PRESENT,
  ATTENDEE_STATUSES.ABSENT,
  ATTENDEE_STATUSES.LATE,
  ATTENDEE_STATUSES.EXCUSED,
] as const;

export const SESSION_ATTENDEE_STATUS_LABELS: Record<
  AttendeeStatusValue,
  string
> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

/** Selected / active styles for the session attendee status icon control. */
export const SESSION_ATTENDEE_STATUS_ACTIVE_CLASSES: Record<
  AttendeeStatusValue,
  string
> = {
  present:
    "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:text-emerald-400",
  absent:
    "bg-rose-500/15 text-rose-700 border border-rose-500/30 dark:text-rose-400",
  late: "bg-amber-500/15 text-amber-700 border border-amber-500/30 dark:text-amber-400",
  excused:
    "bg-sky-500/15 text-sky-700 border border-sky-500/30 dark:text-sky-400",
};

/** Statuses that count as attended for analytics rates. */
export function isAttendeePresentForRate(status: string): boolean {
  return (
    status === ATTENDEE_STATUSES.PRESENT || status === ATTENDEE_STATUSES.LATE
  );
}
