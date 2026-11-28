import "server-only";

import {
  STUDENT_STATUSES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import * as authRepository from "@/repositories/auth.repository";
import * as classRepository from "@/repositories/class.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import type { ManagerStudentRow } from "@/types/manager-student";
import type { Supabase } from "@/services/classes/class-shared";

export async function resolveActiveStudentDiff(
  adminClient: Supabase,
  targetClassId: string,
  sourceClassId: string
): Promise<
  | { success: true; students: ManagerStudentRow[] }
  | { success: false; error: string }
> {
  if (targetClassId === sourceClassId) {
    return {
      success: false,
      error: "Choose a different class to copy from.",
    };
  }

  const [targetResult, sourceResult] = await Promise.all([
    classRepository.findClassById(adminClient, targetClassId),
    classRepository.findClassById(adminClient, sourceClassId),
  ]);

  if (targetResult.error) {
    return { success: false, error: targetResult.error.message };
  }
  if (sourceResult.error) {
    return { success: false, error: sourceResult.error.message };
  }
  if (!targetResult.data) {
    return { success: false, error: "Class not found." };
  }
  if (!sourceResult.data) {
    return { success: false, error: "Source class not found." };
  }

  const targetSemesterId = targetResult.data.semester_id;
  const sourceSemesterId = sourceResult.data.semester_id;

  if (!targetSemesterId) {
    return {
      success: false,
      error: "This class is not linked to a semester.",
    };
  }

  if (!sourceSemesterId || sourceSemesterId !== targetSemesterId) {
    return {
      success: false,
      error: "Source class must belong to the same semester.",
    };
  }

  const [sourceMembersResult, targetMembersResult] = await Promise.all([
    studentClassRepository.listStudentUserIdsByClassId(
      adminClient,
      sourceClassId
    ),
    studentClassRepository.listStudentUserIdsByClassId(
      adminClient,
      targetClassId
    ),
  ]);

  if (sourceMembersResult.error) {
    return { success: false, error: sourceMembersResult.error.message };
  }
  if (targetMembersResult.error) {
    return { success: false, error: targetMembersResult.error.message };
  }

  const targetUserIds = new Set(
    (targetMembersResult.data ?? []).map((row) => row.user_id)
  );
  const sourceUserIds = [
    ...new Set(
      (sourceMembersResult.data ?? [])
        .map((row) => row.user_id)
        .filter((userId) => !targetUserIds.has(userId))
    ),
  ];

  if (sourceUserIds.length === 0) {
    return { success: true, students: [] };
  }

  const [profilesResult, emailsResult] = await Promise.all([
    studentProfileRepository.listStudentProfileDetailsByUserIds(
      adminClient,
      sourceUserIds
    ),
    authRepository.listAuthEmailsByIds(adminClient, sourceUserIds),
  ]);

  if (profilesResult.error) {
    return { success: false, error: profilesResult.error.message };
  }
  if (emailsResult.error) {
    return { success: false, error: emailsResult.error.message };
  }

  const emailById = emailsResult.data;

  let students: ManagerStudentRow[] = (profilesResult.data ?? [])
    .filter((row) => row.status !== STUDENT_STATUSES.INACTIVE)
    .map((row) => ({
      user_id: row.user_id,
      student_profile_id: row.id,
      email: emailById.get(row.user_id) ?? "",
      full_name: row.full_name,
      birth_date: row.birth_date,
      phone: row.phone,
      status: row.status as StudentStatusValue,
      created_at: row.created_at ?? "",
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  if (students.length > 0) {
    const withdrawnResult =
      await studentSemesterRepository.listWithdrawnStudentProfileIdsBySemester(
        adminClient,
        targetSemesterId,
        students.map((student) => student.student_profile_id)
      );
    if (withdrawnResult.error) {
      return { success: false, error: withdrawnResult.error.message };
    }
    const withdrawnIds = new Set(withdrawnResult.data ?? []);
    students = students.map((student) =>
      withdrawnIds.has(student.student_profile_id)
        ? { ...student, semester_dropped: true }
        : student
    );
  }

  return { success: true, students };
}
