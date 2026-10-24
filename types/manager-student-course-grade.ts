import type { ManagerClassFinalExamRow } from "@/types/manager-class-final-exam";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";

/** Bundle used to render / export one student's computed grade sheet. */
export type ComputedStudentGradeSheetBundle = {
  student: ManagerClassStudentRow;
  gradeRow: ManagerClassStudentGradeRow;
  detail: ManagerStudentClassTabDetail;
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
};

/** Weight rule row stored in student_course_grade.task_json_grade_weights. */
export interface ManagerStudentTaskGradeWeightRow {
  key: string;
  label: string;
  weight: number;
}

/** Per-session group grade entry in student_course_grade.group_grades_json. */
export interface ManagerStudentGroupGradeEntry {
  session_id: string;
  session_label?: string;
  grade: number;
}

/** Per-session attendance grade entry in student_course_grade.attendee_grades_json. */
export interface ManagerStudentAttendeeGradeEntry {
  session_id: string;
  session_label?: string;
  grade: number | null;
  status?: string;
}

/** student_course_grade row preview for a student + class enrollment. */
export interface ManagerStudentCourseGrade {
  id: string;
  task_json_grade_weights: ManagerStudentTaskGradeWeightRow[];
  group_grades_json: ManagerStudentGroupGradeEntry[];
  attendee_grades_json: ManagerStudentAttendeeGradeEntry[];
  task_weight: number | null;
  task_total_grade: number | null;
  final_exam_grade: number | null;
  final_exam_weight: number | null;
  type: string | null;
  created_at: string;
}

export type ManagerStudentCourseGradeComponentKey = "tasks" | "final_exam";

export interface ManagerStudentCourseGradeComponent {
  key: ManagerStudentCourseGradeComponentKey;
  label: string;
  grade: number | null;
  weight: number | null;
  weightedPoints: number | null;
  color: string;
}

export function averageGroupGradeFromJson(
  entries: ManagerStudentGroupGradeEntry[] | null | undefined
): number | null {
  if (!entries || entries.length === 0) {
    return null;
  }

  const total = entries.reduce((sum, entry) => sum + entry.grade, 0);
  return Math.round((total / entries.length) * 10) / 10;
}

export function averageAttendeeGradeFromJson(
  entries: ManagerStudentAttendeeGradeEntry[] | null | undefined
): number | null {
  if (!entries || entries.length === 0) {
    return null;
  }

  const graded = entries.filter((entry) => entry.grade != null);
  if (graded.length === 0) {
    return null;
  }

  const total = graded.reduce((sum, entry) => sum + (entry.grade ?? 0), 0);
  return Math.round((total / graded.length) * 10) / 10;
}
