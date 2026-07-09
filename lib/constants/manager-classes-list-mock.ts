import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import { MANAGER_SEMESTER_CLASSES_MOCK } from "@/lib/constants/manager-semester-classes-mock";
import type { ManagerClassRow } from "@/types/manager-class-list";

const semesterNameById = new Map(
  MANAGER_PHASES_MOCK.map((semester) => [semester.id, semester.name])
);

export const MANAGER_CLASSES_LIST_MOCK: ManagerClassRow[] =
  MANAGER_SEMESTER_CLASSES_MOCK.map((classRow, index) => ({
    id: classRow.id,
    name: classRow.name,
    subject_id: classRow.subject_id,
    subject_name: classRow.subject_name,
    subject_nb_sessions: classRow.subject_nb_sessions,
    completed_sessions: classRow.completed_sessions,
    status: classRow.status,
    semester_id: classRow.semester_id,
    semester_name: classRow.semester_id
      ? (semesterNameById.get(classRow.semester_id) ?? null)
      : null,
    enrollment_count: classRow.enrollment_count,
    teacher_count: 1 + (index % 2),
    created_at: classRow.created_at,
  }));

export function getManagerClassesPreview(): ManagerClassRow[] {
  return MANAGER_CLASSES_LIST_MOCK.map((classRow) => ({ ...classRow }));
}
