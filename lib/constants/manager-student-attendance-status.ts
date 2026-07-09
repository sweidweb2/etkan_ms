export const STUDENT_ATTENDANCE_STATUSES = {
  PRESENT: true,
  ABSENT: false,
} as const;

export type StudentAttendanceStatusValue =
  (typeof STUDENT_ATTENDANCE_STATUSES)[keyof typeof STUDENT_ATTENDANCE_STATUSES];
