import type { StudentTaskStatusValue } from "@/lib/constants/manager-student-task-status";

/** final_exam table row for a class. */
export interface ManagerClassFinalExamRow {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  max_grade: number | null;
  created_at: string;
}

/** student_finalexam_grade row joined with student profile. */
export interface ManagerStudentFinalExamGradeRow {
  id: string;
  final_exam_id: string;
  student_id: string;
  full_name: string;
  status: StudentTaskStatusValue;
  submitted_at: string | null;
  grade: number | null;
  notes: string | null;
  graded_at: string | null;
  created_at: string;
}
