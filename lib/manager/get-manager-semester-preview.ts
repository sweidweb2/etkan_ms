import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import type { ManagerSemesterRow } from "@/types/manager-phase";

export function getManagerSemesterPreview(
  semesterId: string
): ManagerSemesterRow {
  return (
    MANAGER_PHASES_MOCK.find((semester) => semester.id === semesterId) ??
    MANAGER_PHASES_MOCK[0]
  );
}

