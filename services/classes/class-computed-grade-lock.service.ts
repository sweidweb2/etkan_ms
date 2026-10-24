import "server-only";

import {
  CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR,
  STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR,
} from "@/lib/manager/class-grades-access";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { assertPermission } from "@/services/auth/authorization.service";
import * as studentCourseGradeRepository from "@/repositories/student-course-grade.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type ComputedGradeLockState = {
  hasComputedGrades: boolean;
  lockedUserIds: string[];
};

export async function assertClassStructureUnlockedForComputedGrades(
  adminClient: Supabase,
  classId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result =
    await studentCourseGradeRepository.countStudentCourseGradesByClassId(
      adminClient,
      classId
    );

  if (result.error) {
    return { ok: false, error: result.error.message };
  }

  if ((result.count ?? 0) > 0) {
    return { ok: false, error: CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR };
  }

  return { ok: true };
}

export async function assertStudentGradeInputsUnlockedForComputedGrade(
  adminClient: Supabase,
  classId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result =
    await studentCourseGradeRepository.findStudentCourseGradeByClassAndUser(
      adminClient,
      classId,
      userId
    );

  if (result.error) {
    return { ok: false, error: result.error.message };
  }

  if (result.data) {
    return { ok: false, error: STUDENT_COMPUTED_GRADE_RECORD_LOCKED_ERROR };
  }

  return { ok: true };
}

export async function getClassComputedGradeLockState(
  adminClient: Supabase,
  classId: string
): Promise<ComputedGradeLockState> {
  const result =
    await studentCourseGradeRepository.listStudentCourseGradeUserIdsByClassId(
      adminClient,
      classId
    );

  if (result.error) {
    throw new Error(result.error.message);
  }

  const lockedUserIds = Array.from(
    new Set((result.data ?? []).map((row) => row.user_id))
  );

  return {
    hasComputedGrades: lockedUserIds.length > 0,
    lockedUserIds,
  };
}

export async function getClassComputedGradeLockStateForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
): Promise<ComputedGradeLockState> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.GRADES_VIEW);

  return getClassComputedGradeLockState(adminClient, classId);
}
