import type { StudentAttendanceStatusValue } from "@/lib/constants/manager-student-attendance-status";

export const MANAGER_STUDENT_ATTENDANCE_STATUS_LABELS: Record<
  StudentAttendanceStatusValue,
  string
> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  excused: "Excused",
};

export const MANAGER_STUDENT_ATTENDANCE_STATUS_BADGE_CLASSES: Record<
  StudentAttendanceStatusValue,
  string
> = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  absent: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  late: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  excused: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
};

export const MANAGER_STUDENT_ATTENDANCE_SLOT_CLASSES: Record<
  StudentAttendanceStatusValue,
  string
> = {
  present: "border-emerald-500/40 bg-emerald-500/8",
  absent: "border-rose-500/40 bg-rose-500/8",
  late: "border-amber-500/40 bg-amber-500/8",
  excused: "border-sky-500/40 bg-sky-500/8",
};
