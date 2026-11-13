/** student_class membership row joined with student profile for class detail. */
export type ClassStudentRow = {
  id: string;
  student_profile_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  joined_at: string;
  /** Pending semester drop request id when present. */
  pending_drop_request_id?: string | null;
  has_pending_drop?: boolean;
  is_team_leader?: boolean;
};

/** @deprecated Prefer `ClassStudentRow`. */
export type ManagerClassStudentRow = ClassStudentRow;
