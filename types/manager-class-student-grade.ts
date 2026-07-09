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
  total_group_grade: number | null;
  task_total_grade: number | null;
  total_attendee_grade: number | null;
  final_exam_grade: number | null;
};
