import { MANAGER_STUDENT_CLASSES_MOCK } from "@/lib/constants/manager-student-classes-mock";

/** Preview: student_profile_ids enrolled in a class (student_class). */
export function getManagerClassStudentProfileIdsPreview(
  classId: string
): string[] {
  const profileIds: string[] = [];

  for (const [studentProfileId, classes] of Object.entries(
    MANAGER_STUDENT_CLASSES_MOCK
  )) {
    if (classes.some((studentClass) => studentClass.class_id === classId)) {
      profileIds.push(studentProfileId);
    }
  }

  return profileIds;
}
