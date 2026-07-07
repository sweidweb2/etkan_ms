import type { StudentStatusValue } from "@/lib/constants/manager-student-status";

/** Combined profiles + student_profiles row for manager student list UI. */
export interface ManagerStudentRow {
  user_id: string;
  student_profile_id: string;
  username: string | null;
  email: string;
  full_name: string;
  birth_date: string | null;
  phone: string | null;
  status: StudentStatusValue;
  created_at: string;
}

/** Academic progress stats for manager student detail view. */
export interface ManagerStudentDetailStats {
  classesRegistered: number;
  classesDone: number;
  classesPending: number;
  tasksDone: number;
  tasksTotal: number;
}
