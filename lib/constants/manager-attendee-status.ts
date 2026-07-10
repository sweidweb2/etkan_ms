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

/** Statuses that count as attended for analytics rates. */
export function isAttendeePresentForRate(status: string): boolean {
  return (
    status === ATTENDEE_STATUSES.PRESENT || status === ATTENDEE_STATUSES.LATE
  );
}
