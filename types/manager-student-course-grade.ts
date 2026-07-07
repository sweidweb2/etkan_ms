/** Weight rule row stored in student_course_grade.task_json_grade_weights. */
export interface ManagerStudentTaskGradeWeightRow {
  key: string;
  label: string;
  weight: number;
}

/** student_course_grade row preview for a student + class enrollment. */
export interface ManagerStudentCourseGrade {
  id: string;
  task_json_grade_weights: ManagerStudentTaskGradeWeightRow[];
  total_group_grade: number | null;
  group_grade_weight: number | null;
  attendee_grade: number | null;
  attendee_weight: number | null;
  task_weight: number | null;
  task_total_grade: number | null;
  final_exam_grade: number | null;
  final_exam_weight: number | null;
  type: string | null;
  created_at: string;
}

export type ManagerStudentCourseGradeComponentKey =
  | "attendance"
  | "tasks"
  | "group"
  | "final_exam";

export interface ManagerStudentCourseGradeComponent {
  key: ManagerStudentCourseGradeComponentKey;
  label: string;
  grade: number | null;
  weight: number | null;
  weightedPoints: number | null;
  color: string;
}
