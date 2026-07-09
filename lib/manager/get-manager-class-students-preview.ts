import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import { MANAGER_STUDENT_CLASSES_MOCK } from "@/lib/constants/manager-student-classes-mock";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";

export function getManagerClassStudentsPreview(
  classId: string
): ManagerClassStudentRow[] {
  const rows: ManagerClassStudentRow[] = [];

  for (const [studentProfileId, studentClasses] of Object.entries(
    MANAGER_STUDENT_CLASSES_MOCK
  )) {
    const enrollment = studentClasses.find(
      (studentClass) => studentClass.class_id === classId
    );

    if (!enrollment) {
      continue;
    }

    const student =
      MANAGER_STUDENTS_MOCK.find(
        (row) => row.student_profile_id === studentProfileId
      ) ?? null;

    rows.push({
      id: enrollment.id,
      student_profile_id: studentProfileId,
      user_id: student?.user_id ?? studentProfileId,
      full_name: student?.full_name ?? enrollment.name,
      username: student?.username ?? null,
      email: student?.email ?? "—",
      phone: student?.phone ?? null,
      enrollment_status: enrollment.status,
      joined_at: enrollment.joined_at,
    });
  }

  return rows.sort(
    (left, right) =>
      new Date(right.joined_at).getTime() - new Date(left.joined_at).getTime()
  );
}
