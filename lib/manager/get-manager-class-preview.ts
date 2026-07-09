import { MANAGER_CLASSES_LIST_MOCK } from "@/lib/constants/manager-classes-list-mock";
import type { ManagerClassRow } from "@/types/manager-class-list";

export function getManagerClassPreview(classId: string): ManagerClassRow {
  return (
    MANAGER_CLASSES_LIST_MOCK.find((classRow) => classRow.id === classId) ??
    MANAGER_CLASSES_LIST_MOCK[0]
  );
}
