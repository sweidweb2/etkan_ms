"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor, getSessionRole } from "@/lib/auth/session";
import {
  DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT,
  DEFAULT_CLASS_GRADE_TASKS_WEIGHT,
} from "@/lib/constants/manager-class-grade-defaults";
import {
  getManagerClassGradesRoute,
  getManagerClassStudentGradesDetailRoute,
} from "@/lib/constants/routes";
import type { FactorWeightsValues } from "@/lib/compute/custom-compute-form-utils";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { updateClassWeightsSchema } from "@/lib/validators/manager/update-class-weights";
import { listClassStudentsForManager } from "@/services/class.service";
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

function revalidateStudentGradeDetail(
  classId: string,
  studentProfileId: string
) {
  revalidatePath(getManagerClassStudentGradesDetailRoute(classId, studentProfileId));
}

function resolveComputeFactorWeights(options?: {
  tasks_weight: string;
  final_exam_weight: string;
}):
  | {
      ok: true;
      factorWeights: FactorWeightsValues;
      computeType: "final" | "custom";
      computeLabel: string;
    }
  | { ok: false; error: string } {
  const payload = {
    tasks_weight:
      options?.tasks_weight ?? String(DEFAULT_CLASS_GRADE_TASKS_WEIGHT),
    final_exam_weight:
      options?.final_exam_weight ?? String(DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT),
  };

  const parsed = updateClassWeightsSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid factor weights.",
    };
  }

  const tasks_weight = Number(payload.tasks_weight.trim());
  const final_exam_weight = Number(payload.final_exam_weight.trim());
  const usesDefaults =
    tasks_weight === DEFAULT_CLASS_GRADE_TASKS_WEIGHT &&
    final_exam_weight === DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT;

  return {
    ok: true,
    factorWeights: {
      group_weight: 0,
      attendee_weight: 0,
      tasks_weight,
      final_exam_weight,
    },
    computeType: usesDefaults ? "final" : "custom",
    computeLabel: usesDefaults ? "class weights" : "custom weights",
  };
}

export async function computeStudentGradeAction(
  classId: string,
  userId: string,
  options?: {
    tasks_weight: string;
    final_exam_weight: string;
  }
): Promise<ClassGradesActionState> {
  const resolved = resolveComputeFactorWeights(options);

  if (!resolved.ok) {
    return { success: false, error: resolved.error };
  }

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
      factorWeights: resolved.factorWeights,
      computeType: resolved.computeType,
      computeLabel: resolved.computeLabel,
    }
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  revalidateClassGrades(classId);
  revalidateStudentGradeDetail(classId, result.row.student_profile_id);

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
  const students = await listClassStudentsForManager(adminClient, actorRole, classId);
  const student = students.find((row) => row.user_id === userId);
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
  if (student) {
    revalidateStudentGradeDetail(classId, student.student_profile_id);
  }

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
  revalidateStudentGradeDetail(classId, result.row.student_profile_id);

  return {
    success: true,
    message: result.message,
    row: result.row,
  };
}
