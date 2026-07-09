import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import { MANAGER_STUDENT_CLASSES_MOCK } from "@/lib/constants/manager-student-classes-mock";
import { STUDENT_CLASS_STATUSES } from "@/lib/constants/manager-student-class-status";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";

const PREVIEW_MIN_CLASS_STUDENTS = 18;

const PREVIEW_FIRST_NAMES = [
  "Lina",
  "Tarek",
  "Nadine",
  "Jad",
  "Rita",
  "Bilal",
  "Mira",
  "Samer",
  "Aya",
  "Fares",
  "Hiba",
  "Khaled",
];

const PREVIEW_LAST_NAMES = [
  "Haddad",
  "Saad",
  "Mansour",
  "Hamdan",
  "Younes",
  "Skaf",
  "Azar",
  "Karam",
  "Issa",
  "Ghosn",
  "Helou",
  "Farah",
];

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % 1_000_000;
  }

  return hash;
}

function buildPreviewExtraStudents(
  classId: string,
  existingCount: number
): ManagerClassStudentRow[] {
  const needed = Math.max(0, PREVIEW_MIN_CLASS_STUDENTS - existingCount);

  return Array.from({ length: needed }, (_, index) => {
    const seed = hashString(`${classId}:preview-student:${index}`);
    const firstName = PREVIEW_FIRST_NAMES[seed % PREVIEW_FIRST_NAMES.length];
    const lastName =
      PREVIEW_LAST_NAMES[(seed + index) % PREVIEW_LAST_NAMES.length];
    const serial = String(index + 1).padStart(2, "0");
    const baseId = `preview-${classId}-${serial}`;
    const joinedDay = ((seed % 24) + 1).toString().padStart(2, "0");
    const joinedHour = (8 + (seed % 9)).toString().padStart(2, "0");
    const joinedMinute = ((seed % 6) * 10).toString().padStart(2, "0");

    return {
      id: `sc-${baseId}`,
      student_profile_id: `sp-${baseId}`,
      user_id: `usr-${baseId}`,
      full_name: `${firstName} ${lastName} ${serial}`,
      username: `${firstName}.${lastName}.${serial}`.toLowerCase(),
      email: `${firstName}.${lastName}.${serial}@preview.edu`.toLowerCase(),
      phone: seed % 4 === 0 ? null : `+961 70 ${String(100000 + (seed % 900000)).slice(0, 6)}`,
      enrollment_status: STUDENT_CLASS_STATUSES.IN_PROGRESS,
      joined_at: `2026-01-${joinedDay}T${joinedHour}:${joinedMinute}:00.000Z`,
    };
  });
}

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

  return [...rows, ...buildPreviewExtraStudents(classId, rows.length)].sort(
    (left, right) =>
      new Date(right.joined_at).getTime() - new Date(left.joined_at).getTime()
  );
}
