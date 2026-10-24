"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
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
import { PERMISSIONS } from "@/lib/constants/permissions";
import { updateClassWeightsSchema } from "@/lib/validators/manager/update-class-weights";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { getClassForManager, listClassStudentsForManager } from "@/services/classes/class.service";
import {
  computeAllStudentCourseGradesForManager,
  computeStudentCourseGradeForManager,
  deleteStudentCourseGradeForManager,
  getStudentClassGradeDetailForManager,
  listComputedStudentGradeSheetBundlesForManager,
} from "@/services/classes/student-course-grade.service";
import type { ManagerClassFinalExamRow } from "@/types/manager-class-final-exam";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import type { ManagerStudentClassTabDetail } from "@/types/manager-student-class-detail";
import type { ComputedStudentGradeSheetBundle } from "@/types/manager-student-course-grade";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassRow } from "@/types/manager-class-list";

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

  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();
  const result = await computeStudentCourseGradeForManager(
    adminClient,
    actor.userId,
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
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();
  const result = await computeAllStudentCourseGradesForManager(
    adminClient,
    actor.userId,
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
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();
  const students = await listClassStudentsForManager(adminClient, actor.userId, classId);
  const student = students.find((row) => row.user_id === userId);
  const result = await deleteStudentCourseGradeForManager(
    adminClient,
    actor.userId,
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
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();
  const result = await computeStudentCourseGradeForManager(
    adminClient,
    actor.userId,
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

export type FetchComputedGradeSheetBundlesActionState = {
  success: boolean;
  error?: string;
  classRow?: ManagerClassRow;
  bundles?: ComputedStudentGradeSheetBundle[];
};

export type StudentFastCertificateBundle = {
  student: ManagerClassStudentRow;
  gradeRow: ManagerClassStudentGradeRow;
  detail: ManagerStudentClassTabDetail;
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
  finalExamGrade: number | null;
};

export type FetchStudentFastCertificateBundleActionState = {
  success: boolean;
  error?: string;
  classRow?: ManagerClassRow;
  bundle?: StudentFastCertificateBundle;
};

export async function fetchStudentFastCertificateBundleAction(
  classId: string,
  studentProfileId: string
): Promise<FetchStudentFastCertificateBundleActionState> {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();

  const unauthorized = await getUnauthorizedError(
    adminClient,
    actor.userId,
    PERMISSIONS.GRADES_EXPORT_FAST_CERTIFICATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  try {
    const [classRow, detailBundle] = await Promise.all([
      getClassForManager(adminClient, actor.userId, classId),
      getStudentClassGradeDetailForManager(
        adminClient,
        actor.userId,
        classId,
        studentProfileId
      ),
    ]);

    if (!classRow) {
      return { success: false, error: "Class not found." };
    }

    if (!detailBundle) {
      return { success: false, error: "Student not found in this class." };
    }

    return {
      success: true,
      classRow,
      bundle: {
        student: detailBundle.student,
        gradeRow: detailBundle.gradeRow,
        detail: detailBundle.detail,
        classTasks: detailBundle.classTasks,
        finalExam: detailBundle.finalExam,
        finalExamGrade: detailBundle.gradeRow.final_exam_grade,
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load student certificate data.",
    };
  }
}

export async function fetchComputedGradeSheetBundlesAction(
  classId: string
): Promise<FetchComputedGradeSheetBundlesActionState> {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();

  try {
    const result = await listComputedStudentGradeSheetBundlesForManager(
      adminClient,
      actor.userId,
      classId
    );

    if (result.bundles.length === 0) {
      return {
        success: false,
        error: "No computed students are available to export.",
      };
    }

    return {
      success: true,
      classRow: result.classRow,
      bundles: result.bundles,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load grade certificates.",
    };
  }
}
