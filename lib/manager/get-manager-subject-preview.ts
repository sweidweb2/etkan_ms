import { MANAGER_SUBJECTS_MOCK } from "@/lib/constants/manager-subjects-mock";
import type { ManagerSubjectRow } from "@/types/manager-subject";

export function getManagerSubjectPreview(subjectId: string): ManagerSubjectRow {
  return (
    MANAGER_SUBJECTS_MOCK.find((subject) => subject.id === subjectId) ??
    MANAGER_SUBJECTS_MOCK[0]
  );
}
