import type { StudentSemesterStatusValue } from "@/lib/constants/manager-student-semester-status";

export interface ManagerStudentSemesterRow {
  id: string;
  student_profile_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  semester_id: string;
  semester_name: string;
  status: StudentSemesterStatusValue;
  created_at: string;
}

export interface ManagerAccountingStudentRow {
  student_profile_id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  semester_id: string | null;
  semester_name: string | null;
  enrollment_status: StudentSemesterStatusValue | null;
  enrolled_at: string | null;
}
