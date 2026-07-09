import type { StudentAttendanceStatusValue } from "@/lib/constants/manager-student-attendance-status";

export const MANAGER_STUDENT_ATTENDANCE_STATUS_LABELS: Record<
  `${StudentAttendanceStatusValue}`,
  string
> = {
  true: "Present",
  false: "Absent",
};

export const MANAGER_STUDENT_ATTENDANCE_STATUS_BADGE_CLASSES: Record<
  `${StudentAttendanceStatusValue}`,
  string
> = {
  true: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  false: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export const MANAGER_STUDENT_ATTENDANCE_SLOT_CLASSES: Record<
  `${StudentAttendanceStatusValue}`,
  string
> = {
  true: "border-emerald-500/40 bg-emerald-500/8",
  false: "border-rose-500/40 bg-rose-500/8",
};

export function getAttendanceDisplayKey(
  status: StudentAttendanceStatusValue
): `${StudentAttendanceStatusValue}` {
  return String(status) as `${StudentAttendanceStatusValue}`;
}
