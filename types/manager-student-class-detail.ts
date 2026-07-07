import type { StudentAttendanceStatusValue } from "@/lib/constants/manager-student-attendance-status";
import type { StudentTaskStatusValue } from "@/lib/constants/manager-student-task-status";
import type { ManagerStudentCourseGrade } from "@/types/manager-student-course-grade";

/** Class session slot + student attendance (sessions implied by tasks.session_id). */
export interface ManagerStudentSessionAttendanceRow {
  session_id: string;
  session_label: string;
  session_at: string;
  status: StudentAttendanceStatusValue;
}

/** Cumulative attendance point for line chart (running present count / rate). */
export interface ManagerStudentAttendanceTrendPoint {
  session_label: string;
  cumulative_present: number;
  cumulative_rate: number;
  streak: number;
}

/** tasks + student_tasks joined preview row. */
export interface ManagerStudentClassTaskRow {
  student_task_id: string;
  task_id: string;
  session_id: string | null;
  title: string;
  due_date: string | null;
  max_grade: number;
  status: StudentTaskStatusValue;
  grade: number | null;
  submitted_at: string | null;
  graded_at: string | null;
}

/** Grade trend point per task (line chart). */
export interface ManagerStudentTaskGradePoint {
  task_label: string;
  grade: number;
  max_grade: number;
  graded_at: string;
}

export interface ManagerStudentClassTabDetail {
  attendanceSlots: ManagerStudentSessionAttendanceRow[];
  attendanceTrend: ManagerStudentAttendanceTrendPoint[];
  tasks: ManagerStudentClassTaskRow[];
  taskGradeTrend: ManagerStudentTaskGradePoint[];
  courseGrade: ManagerStudentCourseGrade | null;
}
