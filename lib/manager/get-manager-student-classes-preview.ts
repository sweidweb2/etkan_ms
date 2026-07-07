import {
  getDefaultStudentClasses,
  MANAGER_STUDENT_CLASSES_MOCK,
} from "@/lib/constants/manager-student-classes-mock";
import type { ManagerStudentClassRow } from "@/types/manager-student-class";

/** Preview lookup until student joined classes are backed by a service. */
export function getManagerStudentClassesPreview(
  studentProfileId: string
): ManagerStudentClassRow[] {
  return (
    MANAGER_STUDENT_CLASSES_MOCK[studentProfileId] ?? getDefaultStudentClasses()
  );
}
