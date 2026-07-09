import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import {
  getManagerStudentSemesterMockSnapshot,
  MANAGER_STUDENT_SEMESTER_MOCK,
} from "@/lib/constants/manager-student-semester-mock";
import type { ManagerStudentSemesterRow } from "@/types/manager-student-semester";
import type { ManagerStudentRow } from "@/types/manager-student";

export function getManagerSemesterStudentsPreview(
  semesterId: string
): ManagerStudentSemesterRow[] {
  return getManagerStudentSemesterMockSnapshot().filter(
    (row) => row.semester_id === semesterId
  );
}

export function getAvailableStudentsForSemesterPreview(
  semesterId: string
): ManagerStudentRow[] {
  const enrolledIds = new Set(
    MANAGER_STUDENT_SEMESTER_MOCK.filter((row) => row.semester_id === semesterId).map(
      (row) => row.student_profile_id
    )
  );

  return MANAGER_STUDENTS_MOCK.filter(
    (student) => !enrolledIds.has(student.student_profile_id)
  );
}
