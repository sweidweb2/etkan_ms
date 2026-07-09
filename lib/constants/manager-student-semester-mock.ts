import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import {
  STUDENT_SEMESTER_STATUSES,
  type StudentSemesterStatusValue,
} from "@/lib/constants/manager-student-semester-status";
import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import type { ManagerStudentSemesterRow } from "@/types/manager-student-semester";

const STATUS_CYCLE: StudentSemesterStatusValue[] = [
  STUDENT_SEMESTER_STATUSES.ACTIVE,
  STUDENT_SEMESTER_STATUSES.PENDING,
  STUDENT_SEMESTER_STATUSES.ACTIVE,
  STUDENT_SEMESTER_STATUSES.INACTIVE,
  STUDENT_SEMESTER_STATUSES.WITHDRAWN,
];

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % 10_000;
  }

  return hash;
}

function buildInitialEnrollments(): ManagerStudentSemesterRow[] {
  const rows: ManagerStudentSemesterRow[] = [];
  const semesterNameById = new Map(
    MANAGER_PHASES_MOCK.map((semester) => [semester.id, semester.name])
  );

  MANAGER_STUDENTS_MOCK.forEach((student, index) => {
    const seed = hashString(student.student_profile_id);
    const semesterCount = seed % 3 === 0 ? 2 : 1;

    for (let offset = 0; offset < semesterCount; offset += 1) {
      const semester =
        MANAGER_PHASES_MOCK[(index + offset) % MANAGER_PHASES_MOCK.length]!;

      rows.push({
        id: `ss-${student.student_profile_id}-${semester.id}`,
        student_profile_id: student.student_profile_id,
        user_id: student.user_id,
        full_name: student.full_name,
        email: student.email,
        phone: student.phone,
        semester_id: semester.id,
        semester_name: semesterNameById.get(semester.id) ?? semester.name,
        status: STATUS_CYCLE[(index + offset) % STATUS_CYCLE.length]!,
        created_at: new Date(
          Date.UTC(2025, 8 + (index % 4), 5 + (index % 20), 10, 0, 0)
        ).toISOString(),
      });
    }
  });

  return rows;
}

export let MANAGER_STUDENT_SEMESTER_MOCK: ManagerStudentSemesterRow[] =
  buildInitialEnrollments();

export function getManagerStudentSemesterMockSnapshot(): ManagerStudentSemesterRow[] {
  return MANAGER_STUDENT_SEMESTER_MOCK.map((row) => ({ ...row }));
}

export function appendManagerStudentSemesterEnrollment(
  row: ManagerStudentSemesterRow
) {
  MANAGER_STUDENT_SEMESTER_MOCK = [
    row,
    ...MANAGER_STUDENT_SEMESTER_MOCK.filter(
      (existing) =>
        !(
          existing.student_profile_id === row.student_profile_id &&
          existing.semester_id === row.semester_id
        )
    ),
  ];
}
