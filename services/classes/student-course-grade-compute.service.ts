import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  computeStudentTaskTotalGrade,
  normalizeFinalExamGradeForCompute,
} from "@/lib/manager/compute-student-course-grade";
import {
  buildStudentGradeMissingItems,
  hasStudentGradeMissingItems,
} from "@/lib/manager/student-grade-missing-items";
import * as studentCourseGradeRepository from "@/repositories/student-course-grade.repository";
import type {
  StudentCourseGradeRecord,
  UpsertStudentCourseGradeInput,
} from "@/repositories/student-course-grade.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  assertClassGradesUnlockedForManager,
  fetchClassStudentRowForManager,
  listClassStudentsForManager,
} from "@/services/classes/class.service";
import {
  buildDefaultTaskWeightsForClass,
  buildTaskWeightPayload,
  COMPUTE_ALL_SAVE_CHUNK,
  loadClassGradeContext,
  mapStoredGradeRow,
  resolveFactorWeights,
  type ClassGradeContext,
  type ComputeGradeOptions,
  type Supabase,
} from "@/services/classes/student-course-grade-shared";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";

function evaluateStudentCourseGradeFromContext(
  student: ManagerClassStudentRow,
  classId: string,
  context: ClassGradeContext,
  options?: ComputeGradeOptions
):
  | { ok: true; payload: UpsertStudentCourseGradeInput }
  | { ok: false; error: string } {
  const factorWeights = resolveFactorWeights(options);
  const studentTasks = context.studentTasksByUserId.get(student.user_id) ?? [];
  const finalExamGradeRecord =
    context.finalExamGradesByUserId.get(student.user_id) ?? null;
  const missingItems = buildStudentGradeMissingItems({
    classTasks: context.classTasks,
    studentTasks,
    finalExam: context.finalExam
      ? {
          id: context.finalExam.id,
          title: context.finalExam.title,
          max_grade: context.finalExam.max_grade,
          due_date: context.finalExam.due_date,
        }
      : null,
    finalExamGrade: finalExamGradeRecord,
    factorWeights,
  });

  if (hasStudentGradeMissingItems(missingItems)) {
    return {
      ok: false,
      error: "This student is missing one or more required grade inputs.",
    };
  }

  const taskWeights =
    options?.taskWeights ??
    buildDefaultTaskWeightsForClass(context.classTasks);

  const taskTotalGrade = computeStudentTaskTotalGrade(
    context.classTasks,
    studentTasks,
    taskWeights
  );
  const finalExamGrade = normalizeFinalExamGradeForCompute(
    finalExamGradeRecord?.grade ?? null,
    finalExamGradeRecord?.status,
    context.finalExamMaxGrade
  );

  if (factorWeights.tasks_weight > 0 && taskTotalGrade == null) {
    return {
      ok: false,
      error: "This student is missing one or more task grades.",
    };
  }

  if (factorWeights.final_exam_weight > 0 && finalExamGrade == null) {
    return {
      ok: false,
      error: "This student is missing a final exam grade.",
    };
  }

  return {
    ok: true,
    payload: {
      user_id: student.user_id,
      class_id: classId,
      task_json_grade_weights: buildTaskWeightPayload(
        context.classTasks,
        taskWeights
      ),
      task_weight: factorWeights.tasks_weight,
      task_total_grade: taskTotalGrade ?? 0,
      final_exam_grade: finalExamGrade ?? 0,
      final_exam_weight: factorWeights.final_exam_weight,
      type: options?.computeType ?? "final",
      existing_id:
        context.storedGradesByUserId.get(student.user_id)?.id ?? null,
    },
  };
}

async function saveEvaluatedStudentCourseGrade(
  adminClient: Supabase,
  actor: AuditActor,
  student: ManagerClassStudentRow,
  payload: UpsertStudentCourseGradeInput
): Promise<
  | { success: true; row: ManagerClassStudentGradeRow }
  | { success: false; error: string }
> {
  const saveResult = await studentCourseGradeRepository.saveStudentCourseGrade(
    adminClient,
    payload
  );

  if (saveResult.error || !saveResult.data) {
    return {
      success: false,
      error: saveResult.error?.message ?? "Unable to save computed grade.",
    };
  }

  const row = mapStoredGradeRow(
    student,
    saveResult.data as StudentCourseGradeRecord
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: payload.existing_id ? "update" : "insert",
    table_name: "student_course_grade",
    record_id: row.course_grade_id ?? saveResult.data.id,
    new_data: {
      class_id: payload.class_id,
      user_id: payload.user_id,
      task_weight: payload.task_weight,
      final_exam_weight: payload.final_exam_weight,
      type: payload.type,
    },
  });

  return { success: true, row };
}

async function saveEvaluatedStudentCourseGradesBatch(
  adminClient: Supabase,
  actor: AuditActor,
  classId: string,
  items: Array<{
    student: ManagerClassStudentRow;
    payload: UpsertStudentCourseGradeInput;
  }>
): Promise<
  Array<
    | { success: true; row: ManagerClassStudentGradeRow }
    | { success: false; error: string }
  >
> {
  if (items.length === 0) {
    return [];
  }

  const saveResult = await studentCourseGradeRepository.upsertStudentCourseGrades(
    adminClient,
    items.map((item) => item.payload)
  );

  if (saveResult.error || !saveResult.data) {
    const message =
      saveResult.error?.message ?? "Unable to save computed grades.";
    return items.map(() => ({ success: false as const, error: message }));
  }

  const savedByUserId = new Map(
    (saveResult.data as StudentCourseGradeRecord[]).map((record) => [
      record.user_id,
      record,
    ])
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_course_grade",
    record_id: classId,
    new_data: {
      class_id: classId,
      user_ids: items.map((item) => item.student.user_id),
      count: items.length,
    },
    metadata: { note: "Batch computed student course grades." },
  });

  return items.map((item) => {
    const saved = savedByUserId.get(item.student.user_id);
    if (!saved) {
      return {
        success: false as const,
        error: "Unable to save computed grade.",
      };
    }

    return {
      success: true as const,
      row: mapStoredGradeRow(item.student, saved),
    };
  });
}

async function computeAndSaveStudentCourseGrade(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  classId: string,
  userId: string,
  options?: ComputeGradeOptions
): Promise<
  | { success: true; row: ManagerClassStudentGradeRow; message: string }
  | { success: false; error: string }
> {
  let student: ManagerClassStudentRow | null;
  let context: ClassGradeContext;

  try {
    [student, context] = await Promise.all([
      fetchClassStudentRowForManager(adminClient, classId, userId),
      loadClassGradeContext(adminClient, classId),
    ]);
  } catch (loadError) {
    return {
      success: false,
      error:
        loadError instanceof Error
          ? loadError.message
          : "Unable to load class grade context.",
    };
  }

  if (!student) {
    return { success: false, error: "Student is not a member of this class." };
  }

  const evaluated = evaluateStudentCourseGradeFromContext(
    student,
    classId,
    context,
    options
  );

  if (!evaluated.ok) {
    return { success: false, error: evaluated.error };
  }

  const saved = await saveEvaluatedStudentCourseGrade(
    adminClient,
    actor,
    student,
    evaluated.payload
  );

  if (!saved.success) {
    return saved;
  }

  return {
    success: true,
    row: saved.row,
    message: options?.computeLabel
      ? `Computed ${student.full_name} using ${options.computeLabel}.`
      : `Computed ${student.full_name}.`,
  };
}

export async function computeStudentCourseGradeForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  classId: string,
  userId: string,
  options?: ComputeGradeOptions
) {
  const permission =
    options?.computeType === "custom"
      ? PERMISSIONS.GRADES_COMPUTE_CUSTOM
      : PERMISSIONS.GRADES_COMPUTE;
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    permission
  );
  if (unauthorized) {
    return { success: false as const, error: unauthorized };
  }

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    classId
  );
  if (!scope.ok) {
    return { success: false as const, error: scope.error };
  }

  const guard = await assertClassGradesUnlockedForManager(
    adminClient,
    actorUserId,
    classId
  );

  if (!guard.ok) {
    return { success: false as const, error: guard.error };
  }

  return computeAndSaveStudentCourseGrade(
    adminClient,
    actorUserId,
    actor,
    classId,
    userId,
    options
  );
}

export async function computeAllStudentCourseGradesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  classId: string,
  studentUserIds: string[],
  options?: ComputeGradeOptions
) {
  const timer = createNavStepTimer("computeAllStudentCourseGrades");
  try {
    const permission =
      options?.computeType === "custom"
        ? PERMISSIONS.GRADES_COMPUTE_CUSTOM
        : PERMISSIONS.GRADES_COMPUTE_ALL;
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(adminClient, actorUserId, permission)
    );
    if (unauthorized) {
      return { success: false as const, error: unauthorized };
    }

    const scope = await assertAssignedTeacherForClassMutation(
      adminClient,
      actor,
      classId
    );
    if (!scope.ok) {
      return { success: false as const, error: scope.error };
    }

    const guard = await timer.step("gradeLock", () =>
      assertClassGradesUnlockedForManager(adminClient, actorUserId, classId)
    );

    if (!guard.ok) {
      return { success: false as const, error: guard.error };
    }

    const enrollmentsResult = await timer.step("enrollments", () =>
      studentClassRepository.listStudentClassesByClassId(adminClient, classId)
    );

    if (enrollmentsResult.error) {
      return { success: false as const, error: enrollmentsResult.error.message };
    }

    const memberUserIds = new Set(
      (enrollmentsResult.data ?? []).map((row) => row.user_id)
    );

    const requestedMemberIds = studentUserIds.filter((userId) =>
      memberUserIds.has(userId)
    );
    const skippedNonMembers = studentUserIds.length - requestedMemberIds.length;

    if (requestedMemberIds.length === 0) {
      return {
        success: false as const,
        error: "No students could be computed.",
      };
    }

    let students: ManagerClassStudentRow[];
    let context: ClassGradeContext;
    try {
      const loaded = await timer.step("gradeContext", () =>
        Promise.all([
          listClassStudentsForManager(adminClient, actorUserId, classId),
          loadClassGradeContext(adminClient, classId),
        ])
      );
      students = loaded[0];
      context = loaded[1];
    } catch (loadError) {
      return {
        success: false as const,
        error:
          loadError instanceof Error
            ? loadError.message
            : "Unable to load class grade context.",
      };
    }

    const studentByUserId = new Map(
      students.map((student) => [student.user_id, student])
    );
    const evaluatedSaves: Array<{
      student: ManagerClassStudentRow;
      payload: UpsertStudentCourseGradeInput;
    }> = [];
    const failures: string[] = [];

    for (const userId of requestedMemberIds) {
      const student = studentByUserId.get(userId);
      if (!student) {
        failures.push("Student is not a member of this class.");
        continue;
      }

      const evaluated = evaluateStudentCourseGradeFromContext(
        student,
        classId,
        context,
        options
      );

      if (!evaluated.ok) {
        failures.push(evaluated.error);
        continue;
      }

      evaluatedSaves.push({ student, payload: evaluated.payload });
    }

    const computedRows: ManagerClassStudentGradeRow[] = [];

    await timer.step("saveGrades", async () => {
      for (
        let index = 0;
        index < evaluatedSaves.length;
        index += COMPUTE_ALL_SAVE_CHUNK
      ) {
        const chunk = evaluatedSaves.slice(
          index,
          index + COMPUTE_ALL_SAVE_CHUNK
        );
        const saved = await saveEvaluatedStudentCourseGradesBatch(
          adminClient,
          actor,
          classId,
          chunk
        );

        for (const result of saved) {
          if (!result.success) {
            failures.push(result.error);
            continue;
          }
          computedRows.push(result.row);
        }
      }
    });

    if (computedRows.length === 0) {
      return {
        success: false as const,
        error: failures[0] ?? "No students could be computed.",
      };
    }

    const skippedTotal = failures.length + skippedNonMembers;
    const skippedNote =
      skippedNonMembers > 0
        ? ` Skipped ${skippedNonMembers} non-member(s).`
        : "";

    return {
      success: true as const,
      rows: computedRows,
      message: `Computed ${computedRows.length} student${
        computedRows.length === 1 ? "" : "s"
      }.${skippedNote}`,
      skippedCount: skippedTotal,
    };
  } finally {
    timer.end();
  }
}

export async function deleteStudentCourseGradeForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  classId: string,
  userId: string
) {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.GRADES_DELETE);
  if (unauthorized) {
    return { success: false as const, error: unauthorized };
  }

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    classId
  );
  if (!scope.ok) {
    return { success: false as const, error: scope.error };
  }

  const [guard, existing] = await Promise.all([
    assertClassGradesUnlockedForManager(adminClient, actorUserId, classId),
    studentCourseGradeRepository.findStudentCourseGradeByClassAndUser(
      adminClient,
      classId,
      userId
    ),
  ]);

  if (!guard.ok) {
    return { success: false as const, error: guard.error };
  }

  if (existing.error) {
    return { success: false as const, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false as const, error: "Computed grade not found." };
  }

  const deleteResult =
    await studentCourseGradeRepository.deleteStudentCourseGradeByClassAndUser(
      adminClient,
      classId,
      userId
    );

  if (deleteResult.error) {
    return { success: false as const, error: deleteResult.error.message };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    table_name: "student_course_grade",
    record_id: existing.data.id,
    old_data: {
      class_id: classId,
      user_id: userId,
    },
  });

  return { success: true as const, message: "Computed grade deleted." };
}
