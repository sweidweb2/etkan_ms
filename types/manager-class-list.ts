/** Full classes row for manager manage-classes page (classes table preview). */
export interface ManagerClassRow {
  id: string;
  name: string;
  subject_id: string;
  subject_name: string;
  subject_nb_sessions: number;
  completed_sessions: number;
  status: string;
  semester_id: string | null;
  semester_name: string | null;
  enrollment_count: number;
  teacher_count: number;
  created_at: string;
}
