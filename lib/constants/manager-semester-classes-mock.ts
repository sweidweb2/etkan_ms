import { MANAGER_CLASSES_MOCK } from "@/lib/constants/manager-classes-mock";
import {
  getMockClassCompletedSessions,
  getSubjectSessionsPreview,
} from "@/lib/constants/manager-subject-sessions-preview";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";

const SEMESTER_CLASS_ASSIGNMENTS: Record<string, string[]> = {
  "semester-001-fall-core": [
    "cls-math-adv",
    "cls-eng-lit",
    "cls-phys-1",
    "cls-bio-cell",
    "cls-math-geo",
  ],
  "semester-002-stem-focus": [
    "cls-chem-org",
    "cls-cs-py",
    "cls-default-3",
    "cls-phys-1",
  ],
  "semester-003-language-bridge": [
    "cls-eng-write",
    "cls-arabic-lit",
    "cls-default-2",
  ],
  "semester-004-exam-prep": [
    "cls-math-adv",
    "cls-math-geo",
    "cls-phys-1",
    "cls-chem-org",
    "cls-bio-cell",
    "cls-hist-mod",
  ],
  "semester-005-summer-bootcamp": ["cls-cs-py", "cls-pe-fit", "cls-pe-swim"],
  "semester-006-business-track": ["cls-econ-intro", "cls-hist-mod", "cls-eng-lit"],
  "semester-007-health-sciences": ["cls-bio-cell", "cls-chem-org", "cls-default-3"],
  "semester-008-creative-track": [
    "cls-art-studio",
    "cls-music-theory",
    "cls-eng-write",
  ],
};

const classSemesterMap = new Map<string, string>();

for (const [semesterId, classIds] of Object.entries(SEMESTER_CLASS_ASSIGNMENTS)) {
  for (const classId of classIds) {
    if (!classSemesterMap.has(classId)) {
      classSemesterMap.set(classId, semesterId);
    }
  }
}

const COMPLETED_SESSION_OVERRIDES: Record<string, number> = {
  "cls-art-studio": 6,
  "cls-music-theory": 5,
  "cls-eng-write": 3,
  "cls-math-adv": 8,
  "cls-eng-lit": 9,
  "cls-phys-1": 4,
};

export const MANAGER_SEMESTER_CLASSES_MOCK: ManagerSemesterClassRow[] =
  MANAGER_CLASSES_MOCK.map((classOption, index) => {
    const subjectPreview = getSubjectSessionsPreview(classOption.subject_name);
    const subjectNbSessions = subjectPreview.nb_sessions;
    const completedSessions =
      COMPLETED_SESSION_OVERRIDES[classOption.class_id] ??
      getMockClassCompletedSessions(classOption.class_id, subjectNbSessions);

    return {
      id: classOption.class_id,
      subject_id: subjectPreview.subject_id,
      subject_name: classOption.subject_name,
      subject_nb_sessions: subjectNbSessions,
      completed_sessions: Math.min(completedSessions, subjectNbSessions),
      name: classOption.name,
      status: index % 6 === 0 ? "inactive" : "active",
      semester_id: classSemesterMap.get(classOption.class_id) ?? null,
      enrollment_count: 12 + (index % 8) * 2,
      created_at: new Date(
        Date.UTC(2025, 7, 10 + (index % 20), 9 + (index % 6), 0, 0)
      ).toISOString(),
    };
  });

export function getManagerSemesterClassesPreview(
  semesterId: string
): ManagerSemesterClassRow[] {
  return MANAGER_SEMESTER_CLASSES_MOCK.filter(
    (classRow) => classRow.semester_id === semesterId
  ).map((classRow) => ({ ...classRow }));
}

export function getManagerUnlinkedSemesterClassesPreview(): ManagerSemesterClassRow[] {
  return MANAGER_SEMESTER_CLASSES_MOCK.filter(
    (classRow) => classRow.semester_id === null
  ).map((classRow) => ({ ...classRow }));
}
