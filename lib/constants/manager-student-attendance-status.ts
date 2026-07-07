export const STUDENT_ATTENDANCE_STATUSES = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late",
  EXCUSED: "excused",
} as const;

export type StudentAttendanceStatusValue =
  (typeof STUDENT_ATTENDANCE_STATUSES)[keyof typeof STUDENT_ATTENDANCE_STATUSES];
