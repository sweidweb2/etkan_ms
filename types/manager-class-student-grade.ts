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
  course_grade_id?: string | null;
  compute_type?: string | null;
  stored_tasks_weight?: number | null;
  stored_final_exam_weight?: number | null;
  stored_task_weights?: Record<string, number> | null;
};
