"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor, getSessionRole } from "@/lib/auth/session";
import {
  DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT,
  DEFAULT_CLASS_GRADE_TASKS_WEIGHT,
} from "@/lib/constants/manager-class-grade-defaults";
import { getManagerClassGradesRoute } from "@/lib/constants/routes";
import type { FactorWeightsValues } from "@/lib/compute/custom-compute-form-utils";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  computeAllStudentCourseGradesForManager,
  computeStudentCourseGradeForManager,
  deleteStudentCourseGradeForManager,
} from "@/services/student-course-grade.service";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";

export type ClassGradesActionState = {
  success: boolean;
  error?: string;
  message?: string;
  rows?: ManagerClassStudentGradeRow[];
  row?: ManagerClassStudentGradeRow;
};

function revalidateClassGrades(classId: string) {
  revalidatePath(getManagerClassGradesRoute(classId));
}

export async function computeStudentGradeAction(
  classId: string,
  userId: string
): Promise<ClassGradesActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const adminClient = createSupabaseAdminClient();
  const result = await computeStudentCourseGradeForManager(
    adminClient,
    actorRole,
    actor,
    classId,
    userId,
    {
      factorWeights: {
        group_weight: 0,
        attendee_weight: 0,
        tasks_weight: DEFAULT_CLASS_GRADE_TASKS_WEIGHT,
        final_exam_weight: DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT,
      },
      computeType: "final",
      computeLabel: "class weights",
    }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateClassGrades(classId);

  return {
    success: true,
    message: result.message,
    row: result.row,
  };
}

export async function computeAllStudentGradesAction(
  classId: string,
  studentUserIds: string[],
  options?: {
    factorWeights?: FactorWeightsValues;
    taskWeights?: Record<string, string>;
    computeLabel?: string;
  }
): Promise<ClassGradesActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const adminClient = createSupabaseAdminClient();
  const result = await computeAllStudentCourseGradesForManager(
    adminClient,
    actorRole,
    actor,
    classId,
    studentUserIds,
    {
      factorWeights: options?.factorWeights,
      taskWeights: options?.taskWeights,
      computeType: options?.factorWeights ? "custom" : "final",
      computeLabel: options?.computeLabel,
    }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateClassGrades(classId);

  return {
    success: true,
    message: result.message,
    rows: result.rows,
  };
}

export async function deleteComputedGradeAction(
  classId: string,
  userId: string
): Promise<ClassGradesActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const adminClient = createSupabaseAdminClient();
  const result = await deleteStudentCourseGradeForManager(
    adminClient,
    actorRole,
    actor,
    classId,
    userId
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateClassGrades(classId);

  return {
    success: true,
    message: result.message,
  };
}

export async function computeStudentGradeAloneAction(
  classId: string,
  userId: string,
  options: {
    factorWeights: FactorWeightsValues;
    taskWeights: Record<string, string>;
  }
): Promise<ClassGradesActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const adminClient = createSupabaseAdminClient();
  const result = await computeStudentCourseGradeForManager(
    adminClient,
    actorRole,
    actor,
    classId,
    userId,
    {
      factorWeights: options.factorWeights,
      taskWeights: options.taskWeights,
      computeType: "custom",
      computeLabel: "custom weights",
    }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateClassGrades(classId);
  revalidatePath(getManagerClassGradesRoute(classId));

  return {
    success: true,
    message: result.message,
    row: result.row,
  };
}
