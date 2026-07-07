import type { StudentClassStatusValue } from "@/lib/constants/manager-student-class-status";

/** Joined class row for manager student detail tabs (student_class + class + subject). */
export interface ManagerStudentClassRow {
  id: string;
  class_id: string;
  name: string;
  subject_name: string;
  status: StudentClassStatusValue;
  joined_at: string;
}
