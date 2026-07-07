import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import type { ManagerStudentRow } from "@/types/manager-student";

/** Preview lookup until manager student details are backed by a service. */
export function getManagerStudentPreview(studentProfileId: string): ManagerStudentRow {
  return (
    MANAGER_STUDENTS_MOCK.find(
      (student) => student.student_profile_id === studentProfileId
    ) ?? MANAGER_STUDENTS_MOCK[0]
  );
}
