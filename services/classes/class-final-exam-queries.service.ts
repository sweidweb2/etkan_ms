import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
} from "@/services/auth/authorization.service";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import type {
  FinalExamRecord,
  StudentFinalExamGradeRecord,
} from "@/repositories/final-exam.repository";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import {
  buildFullNameByUserId,
  mapFinalExamRecord,
  mapStudentFinalExamGradeRecord,
  type Supabase,
} from "@/services/classes/class-shared";

export async function getClassFinalExamForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<{
  finalExam: ManagerClassFinalExamRow | null;
  studentGrades: ManagerStudentFinalExamGradeRow[];
}> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.FINAL_EXAMS_VIEW);
  return loadClassFinalExam(adminClient, classId);
}

/** Same as `getClassFinalExamForManager` without the permission check. */
export async function loadClassFinalExam(
  adminClient: Supabase,
  classId: string
): Promise<{
  finalExam: ManagerClassFinalExamRow | null;
  studentGrades: ManagerStudentFinalExamGradeRow[];
}> {
  const { data: exam, error } = await finalExamRepository.findFinalExamByClassId(
    adminClient,
    classId
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!exam) {
    return { finalExam: null, studentGrades: [] };
  }

  const { data: grades, error: gradesError } =
    await finalExamRepository.listStudentFinalExamGradesByFinalExamId(
      adminClient,
      exam.id
    );

  if (gradesError) {
    throw new Error(gradesError.message);
  }

  const gradeRecords = (grades ?? []) as StudentFinalExamGradeRecord[];
  const nameByUserId = await buildFullNameByUserId(
    adminClient,
    gradeRecords.map((row) => row.student_id)
  );

  return {
    finalExam: mapFinalExamRecord(exam as FinalExamRecord),
    studentGrades: gradeRecords.map((row) =>
      mapStudentFinalExamGradeRecord(
        row,
        nameByUserId.get(row.student_id) ?? "Unknown student"
      )
    ),
  };
}
