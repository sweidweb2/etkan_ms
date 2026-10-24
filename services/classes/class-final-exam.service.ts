import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  STUDENT_TASK_STATUSES,
} from "@/lib/constants/manager-student-task-status";
import { createFinalExamSchema } from "@/lib/validators/manager/create-final-exam";
import { createEditStudentFinalExamGradeSchema } from "@/lib/validators/manager/edit-student-finalexam-grade";
import { updateFinalExamSchema } from "@/lib/validators/manager/update-final-exam";
import * as classRepository from "@/repositories/class.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import type {
  FinalExamRecord,
  StudentFinalExamGradeRecord,
} from "@/repositories/final-exam.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { assertClassStructureUnlockedForComputedGrades, assertStudentGradeInputsUnlockedForComputedGrade } from "@/services/classes/class-computed-grade-lock.service";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import {
  buildFullNameByUserId,
  isUuid,
  mapFinalExamRecord,
  mapStudentFinalExamGradeRecord,
  normalizeOptionalString,
  toIsoOrNull,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/class-shared";

export type CreateFinalExamResult =
  | {
      success: true;
      finalExam: ManagerClassFinalExamRow;
      studentGrades: ManagerStudentFinalExamGradeRow[];
      message: string;
    }
  | MutationFailure;

export async function createFinalExamForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    title: string;
    description?: string;
    due_date?: string;
    max_grade?: string | number;
  }
): Promise<CreateFinalExamResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.FINAL_EXAMS_CREATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createFinalExamSchema.safeParse({
    title: input.title,
    description: input.description,
    due_date: input.due_date,
    max_grade: input.max_grade,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existingClass, structureGuard, existingExam] = await Promise.all([
    classRepository.findClassById(adminClient, input.class_id),
    assertClassStructureUnlockedForComputedGrades(adminClient, input.class_id),
    finalExamRepository.findFinalExamByClassId(adminClient, input.class_id),
  ]);

  if (existingClass.error) {
    return { success: false, error: existingClass.error.message };
  }

  if (!existingClass.data) {
    return { success: false, error: "Class not found." };
  }

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  if (existingExam.error) {
    return { success: false, error: existingExam.error.message };
  }

  if (existingExam.data) {
    return {
      success: false,
      error: "This class already has a final exam.",
    };
  }

  const maxGrade =
    parsed.data.max_grade === "" || parsed.data.max_grade === undefined
      ? null
      : Number(parsed.data.max_grade);

  const { data, error } = await finalExamRepository.createFinalExam(
    adminClient,
    {
      class_id: input.class_id,
      title: parsed.data.title.trim(),
      description: normalizeOptionalString(parsed.data.description),
      due_date: toIsoOrNull(parsed.data.due_date),
      max_grade: maxGrade,
    }
  );

  if (error || !data) {
    const normalized = (error?.message ?? "").toLowerCase();
    if (normalized.includes("unique") || normalized.includes("duplicate")) {
      return {
        success: false,
        error: "This class already has a final exam.",
      };
    }

    return {
      success: false,
      error: error?.message ?? "Unable to create final exam.",
    };
  }

  // Seed pending final-exam grade rows for current class members only.
  // Existing grade rows for students who left are retained (not deleted).
  const membersResult =
    await studentClassRepository.listMemberUserIdsByClassId(
      adminClient,
      input.class_id
    );

  if (membersResult.error) {
    return { success: false, error: membersResult.error.message };
  }

  const memberUserIds = (membersResult.data ?? []).map((row) => row.user_id);
  const gradesResult = await finalExamRepository.createStudentFinalExamGrades(
    adminClient,
    memberUserIds.map((studentId) => ({
      final_exam_id: data.id,
      student_id: studentId,
      status: STUDENT_TASK_STATUSES.PENDING,
    }))
  );

  if (gradesResult.error) {
    await finalExamRepository.deleteFinalExamById(adminClient, data.id);
    return { success: false, error: gradesResult.error.message };
  }

  const gradeRecords = (gradesResult.data ?? []) as StudentFinalExamGradeRecord[];
  const nameByUserId = await buildFullNameByUserId(
    adminClient,
    gradeRecords.map((row) => row.student_id)
  );

  const finalExam = mapFinalExamRecord(data as FinalExamRecord);
  const studentGrades = gradeRecords.map((row) =>
    mapStudentFinalExamGradeRecord(
      row,
      nameByUserId.get(row.student_id) ?? "Unknown student"
    )
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "final_exam",
    record_id: finalExam.id,
    new_data: {
      class_id: finalExam.class_id,
      title: finalExam.title,
      student_grade_count: studentGrades.length,
    },
    metadata: {
      note: "Final exam created with pending grade rows for enrolled students.",
    },
  });

  return {
    success: true,
    finalExam,
    studentGrades,
    message: "Final exam created.",
  };
}

export type UpdateFinalExamResult =
  | {
      success: true;
      finalExam: ManagerClassFinalExamRow;
      message: string;
    }
  | MutationFailure;

export async function updateFinalExamForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    title: string;
    description?: string;
    due_date?: string;
    max_grade?: string | number;
  }
): Promise<UpdateFinalExamResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.FINAL_EXAMS_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!isUuid(input.id)) {
    return { success: false, error: "Final exam not found." };
  }

  const parsed = updateFinalExamSchema.safeParse({
    title: input.title,
    description: input.description,
    due_date: input.due_date,
    max_grade: input.max_grade,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await finalExamRepository.findFinalExamById(
    adminClient,
    input.id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Final exam not found." };
  }

  const structureGuard = await assertClassStructureUnlockedForComputedGrades(
    adminClient,
    existing.data.class_id
  );

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  const maxGrade =
    parsed.data.max_grade === "" || parsed.data.max_grade === undefined
      ? null
      : Number(parsed.data.max_grade);

  const { data, error } = await finalExamRepository.updateFinalExam(
    adminClient,
    input.id,
    {
      title: parsed.data.title.trim(),
      description: normalizeOptionalString(parsed.data.description),
      due_date: toIsoOrNull(parsed.data.due_date),
      max_grade: maxGrade,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update final exam.",
    };
  }

  const finalExam = mapFinalExamRecord(data as FinalExamRecord);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "final_exam",
    record_id: finalExam.id,
    old_data: {
      title: existing.data.title,
      description: existing.data.description,
      due_date: existing.data.due_date,
      max_grade: existing.data.max_grade,
    },
    new_data: {
      title: finalExam.title,
      description: finalExam.description,
      due_date: finalExam.due_date,
      max_grade: finalExam.max_grade,
    },
    metadata: { note: "Final exam updated." },
  });

  return {
    success: true,
    finalExam,
    message: "Final exam updated.",
  };
}

export type UpdateStudentFinalExamGradeResult =
  | {
      success: true;
      studentGrade: ManagerStudentFinalExamGradeRow;
      message: string;
    }
  | MutationFailure;

export async function updateStudentFinalExamGradeForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    status: string;
    grade?: string | number;
    notes?: string;
    submitted_at?: string;
  }
): Promise<UpdateStudentFinalExamGradeResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.FINAL_EXAMS_UPDATE_STUDENT);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existing = await finalExamRepository.findStudentFinalExamGradeById(
    adminClient,
    input.id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Final exam grade not found." };
  }

  const finalExamResult = await finalExamRepository.findFinalExamById(
    adminClient,
    existing.data.final_exam_id
  );

  if (finalExamResult.error) {
    return { success: false, error: finalExamResult.error.message };
  }

  if (!finalExamResult.data) {
    return { success: false, error: "Final exam not found." };
  }

  const studentGuard = await assertStudentGradeInputsUnlockedForComputedGrade(
    adminClient,
    finalExamResult.data.class_id,
    existing.data.student_id
  );

  if (!studentGuard.ok) {
    return { success: false, error: studentGuard.error };
  }

  const parsed = createEditStudentFinalExamGradeSchema(
    finalExamResult.data.max_grade,
    finalExamResult.data.due_date
  ).safeParse({
    status: input.status,
    grade: input.grade,
    notes: input.notes,
    submitted_at: input.submitted_at,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const grade =
    parsed.data.grade === "" || parsed.data.grade === undefined
      ? null
      : Number(parsed.data.grade);

  const gradedAt = new Date().toISOString();
  const shouldSetGradedAt =
    grade !== null &&
    (parsed.data.status === STUDENT_TASK_STATUSES.GRADED ||
      parsed.data.status === STUDENT_TASK_STATUSES.LATE);

  const { data, error } = await finalExamRepository.updateStudentFinalExamGrade(
    adminClient,
    input.id,
    {
      status: parsed.data.status,
      grade,
      notes: normalizeOptionalString(parsed.data.notes),
      submitted_at: toIsoOrNull(parsed.data.submitted_at),
      graded_at: shouldSetGradedAt ? gradedAt : null,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update final exam grade.",
    };
  }

  const nameByUserId = await buildFullNameByUserId(adminClient, [
    data.student_id,
  ]);

  const studentGrade = mapStudentFinalExamGradeRecord(
    data as StudentFinalExamGradeRecord,
    nameByUserId.get(data.student_id) ?? "Unknown student"
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    table_name: "student_finalexam_grade",
    record_id: studentGrade.id,
    old_data: {
      status: existing.data.status,
      grade: existing.data.grade,
    },
    new_data: {
      status: studentGrade.status,
      grade: studentGrade.grade,
    },
  });

  return {
    success: true,
    studentGrade,
    message: "Final exam grade updated.",
  };
}
