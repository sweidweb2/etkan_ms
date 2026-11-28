"use server";

import { revalidatePath } from "next/cache";
import { runManagerMutation } from "@/lib/actions/run-manager-action";
import {
  DEFAULT_CLASS_GRADE_FINAL_EXAM_WEIGHT,
  DEFAULT_CLASS_GRADE_TASKS_WEIGHT,
} from "@/lib/constants/manager-class-grade-defaults";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerClassGradesRoute,
  getManagerClassStudentGradesDetailRoute,
} from "@/lib/constants/routes";
import type { FactorWeightsValues } from "@/lib/compute/custom-compute-form-utils";
import { resolveClassRosterOptions } from "@/lib/manager/class-roster-mode";
import { updateClassWeightsSchema } from "@/lib/validators/manager/update-class-weights";
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

  return runManagerMutation({
    permission:
      resolved.computeType === "custom"
        ? PERMISSIONS.GRADES_COMPUTE_CUSTOM
        : PERMISSIONS.GRADES_COMPUTE,
    data: { classId, userId, resolved },
    mutate: ({ adminClient, actor, data }) =>
      computeStudentCourseGradeForManager(
        adminClient,
        actor.userId,
        actor,
        data.classId,
        data.userId,
        {
          factorWeights: data.resolved.factorWeights,
          computeType: data.resolved.computeType,
          computeLabel: data.resolved.computeLabel,
        }
      ),
    revalidate: (result, data) => {
      revalidateClassGrades(data.classId);
      revalidateStudentGradeDetail(data.classId, result.row.student_profile_id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      row: result.row,
    }),
  });
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
  const isCustom = Boolean(options?.factorWeights);

  return runManagerMutation({
    permission: isCustom
      ? PERMISSIONS.GRADES_COMPUTE_CUSTOM
      : PERMISSIONS.GRADES_COMPUTE_ALL,
    data: { classId, studentUserIds, options, isCustom },
    mutate: ({ adminClient, actor, data }) =>
      computeAllStudentCourseGradesForManager(
        adminClient,
        actor.userId,
        actor,
        data.classId,
        data.studentUserIds,
        {
          factorWeights: data.options?.factorWeights,
          taskWeights: data.options?.taskWeights,
          computeType: data.isCustom ? "custom" : "final",
          computeLabel: data.options?.computeLabel,
        }
      ),
    revalidate: (_result, data) => {
      revalidateClassGrades(data.classId);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      rows: result.rows,
    }),
  });
}

export async function deleteComputedGradeAction(
  classId: string,
  userId: string
): Promise<ClassGradesActionState> {
  return runManagerMutation({
    permission: PERMISSIONS.GRADES_DELETE,
    data: { classId, userId },
    mutate: async ({ adminClient, actor, data }) => {
      const students = await listClassStudentsForManager(
        adminClient,
        actor.userId,
        data.classId,
        resolveClassRosterOptions({ mode: "grades" })
      );
      const student = students.find((row) => row.user_id === data.userId);
      const result = await deleteStudentCourseGradeForManager(
        adminClient,
        actor.userId,
        actor,
        data.classId,
        data.userId
      );

      if (!result.success) {
        return result;
      }

      return {
        ...result,
        studentProfileId: student?.student_profile_id ?? null,
      };
    },
    revalidate: (result, data) => {
      revalidateClassGrades(data.classId);
      if (result.studentProfileId) {
        revalidateStudentGradeDetail(data.classId, result.studentProfileId);
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function computeStudentGradeAloneAction(
  classId: string,
  userId: string,
  options: {
    factorWeights: FactorWeightsValues;
    taskWeights: Record<string, string>;
  }
): Promise<ClassGradesActionState> {
  return runManagerMutation({
    permission: PERMISSIONS.GRADES_COMPUTE_CUSTOM,
    data: { classId, userId, options },
    mutate: ({ adminClient, actor, data }) =>
      computeStudentCourseGradeForManager(
        adminClient,
        actor.userId,
        actor,
        data.classId,
        data.userId,
        {
          factorWeights: data.options.factorWeights,
          taskWeights: data.options.taskWeights,
          computeType: "custom",
          computeLabel: "custom weights",
        }
      ),
    revalidate: (result, data) => {
      revalidateClassGrades(data.classId);
      revalidateStudentGradeDetail(data.classId, result.row.student_profile_id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      row: result.row,
    }),
  });
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
  return runManagerMutation({
    permission: PERMISSIONS.GRADES_EXPORT_FAST_CERTIFICATE,
    data: { classId, studentProfileId },
    mutate: async ({ adminClient, actor, data }) => {
      const [classRow, detailBundle] = await Promise.all([
        getClassForManager(adminClient, actor.userId, data.classId, {
          includeCounts: false,
        }),
        getStudentClassGradeDetailForManager(
          adminClient,
          actor.userId,
          data.classId,
          data.studentProfileId
        ),
      ]);

      if (!classRow) {
        return { success: false as const, error: "Class not found." };
      }

      if (!detailBundle) {
        return {
          success: false as const,
          error: "Student not found in this class.",
        };
      }

      return {
        success: true as const,
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
    },
    mapSuccess: (result) => ({
      success: true,
      classRow: result.classRow,
      bundle: result.bundle,
    }),
  });
}

export async function fetchComputedGradeSheetBundlesAction(
  classId: string
): Promise<FetchComputedGradeSheetBundlesActionState> {
  return runManagerMutation({
    permission: PERMISSIONS.GRADES_EXPORT_CERTIFICATES,
    data: { classId },
    mutate: async ({ adminClient, actor, data }) => {
      const result = await listComputedStudentGradeSheetBundlesForManager(
        adminClient,
        actor.userId,
        data.classId
      );

      if (result.bundles.length === 0) {
        return {
          success: false as const,
          error: "No computed students are available to export.",
        };
      }

      return {
        success: true as const,
        classRow: result.classRow,
        bundles: result.bundles,
      };
    },
    mapSuccess: (result) => ({
      success: true,
      classRow: result.classRow,
      bundles: result.bundles,
    }),
  });
}
