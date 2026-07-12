export type ManagerClassStudentGradeMissingKind = "task" | "final_exam";

export type ManagerClassStudentGradeMissingReason =
  | "missing_record"
  | "pending"
  | "not_graded";

export type ManagerClassStudentGradeMissingItem = {
  kind: ManagerClassStudentGradeMissingKind;
  reason: ManagerClassStudentGradeMissingReason;
  label: string;
  status: string | null;
  grade: number | null;
  taskId?: string;
  sessionId?: string;
  studentTaskId?: string | null;
  finalExamGradeId?: string | null;
  maxGrade?: number | null;
  dueDate?: string | null;
};

export type ManagerClassStudentGradeRow = {
  student_profile_id: string;
  user_id: string;
  full_name: string;
  username: string | null;
  email: string;
  phone: string | null;
  enrollment_status: string;
  is_computed: boolean;
  total_grade: number | null;
  task_total_grade: number | null;
  final_exam_grade: number | null;
  missing_items: ManagerClassStudentGradeMissingItem[];
  course_grade_id?: string | null;
  compute_type?: string | null;
  stored_tasks_weight?: number | null;
  stored_final_exam_weight?: number | null;
  stored_task_weights?: Record<string, number> | null;
};
