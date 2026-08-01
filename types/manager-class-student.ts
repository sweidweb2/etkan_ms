/** student_class membership row joined with student profile for class detail table. */
export interface ManagerClassStudentRow {
  id: string;
  student_profile_id: string;
  user_id: string;
  full_name: string;
  username: string | null;
  email: string;
  phone: string | null;
  joined_at: string;
}
