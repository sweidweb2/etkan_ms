import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  STUDENT_TASK_STATUSES,
} from "@/lib/constants/manager-student-task-status";
import {
  YES_NO_LOCKED_MESSAGE,
  YES_NO_MAX_GRADE,
} from "@/lib/constants/task-yes-no";
import { createClassTaskSchema } from "@/lib/validators/manager/create-class-task";
import { updateClassTaskSchema } from "@/lib/validators/manager/update-class-task";
import { createEditStudentTaskSchema } from "@/lib/validators/manager/edit-student-task";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import * as classRepository from "@/repositories/class.repository";
import * as classTaskRepository from "@/repositories/class-task.repository";
import type { ClassTaskRecord } from "@/repositories/class-task.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import type { StudentTaskRecord } from "@/repositories/student-task.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  assertClassStructureUnlockedForComputedGrades,
  assertStudentGradeInputsUnlockedForComputedGrade,
} from "@/services/classes/class-computed-grade-lock.service";
import {
  cloneAllSubjectTasksToClass,
  importMissingSubjectTasksToClass,
} from "@/services/classes/class-task-clone.service";
import { removeStorageForStudentTaskUploads } from "@/services/classes/student-task-upload.service";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";
import {
  attachTaskEditorNames,
  buildStudentDisplayByUserId,
  didTaskMaxGradeDecrease,
  isUuid,
  mapStudentTaskRow,
  mapTaskRecord,
  normalizeOptionalString,
  parseTaskMaxGrade,
  toIsoOrNull,
  type ClassMutationAuthorizer,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/session-shared";
import type {
  ManagerClassTaskRow,
  ManagerStudentTaskRow,
} from "@/types/manager-class-session-detail";

function addDaysIso(startIso: string, days: number): string {
  const start = new Date(startIso);
  start.setUTCDate(start.getUTCDate() + days);
  return start.toISOString();
}

export type CreateClassTaskResult =
  | {
      success: true;
      task: ManagerClassTaskRow;
      studentTasks: ManagerStudentTaskRow[];
      message: string;
    }
  | MutationFailure;

export type CreateClassTaskInput = {
  class_id: string;
  title: string;
  description?: string;
  period: string | number;
  max_grade?: string | number;
  is_yes_no?: boolean;
  sort_order?: string | number;
};

export async function createClassTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: CreateClassTaskInput
): Promise<CreateClassTaskResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  return applyCreateClassTask(adminClient, actor, input, (classId) =>
    assertAssignedTeacherForClassMutation(adminClient, actor, classId)
  );
}

/**
 * Shared create core. Callers check their role permission first;
 * `authorizeClass` scopes the actor to the target class.
 */
export async function applyCreateClassTask(
  adminClient: Supabase,
  actor: AuditActor,
  input: CreateClassTaskInput,
  authorizeClass: ClassMutationAuthorizer
): Promise<CreateClassTaskResult> {
  const timer = createNavStepTimer("createClassTask");
  try {
    const parsed = createClassTaskSchema.safeParse({
      title: input.title,
      description: input.description,
      period: input.period,
      max_grade: input.max_grade,
      is_yes_no: input.is_yes_no,
      sort_order: input.sort_order,
    });

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    if (!isUuid(input.class_id)) {
      return { success: false, error: "Class not found." };
    }

    const scope = await timer.step("auth", () => authorizeClass(input.class_id));
    if (!scope.ok) {
      return { success: false, error: scope.error };
    }

    const classResult = await timer.step("class", () =>
      classRepository.findClassDetailById(adminClient, input.class_id)
    );
    if (classResult.error) {
      return { success: false, error: classResult.error.message };
    }
    if (!classResult.data) {
      return { success: false, error: "Class not found." };
    }

    const structureGuard = await timer.step("structureGuard", () =>
      assertClassStructureUnlockedForComputedGrades(adminClient, input.class_id)
    );
    if (!structureGuard.ok) {
      return { success: false, error: structureGuard.error };
    }

    const isYesNo = parsed.data.is_yes_no ?? false;
    const maxGrade = isYesNo
      ? YES_NO_MAX_GRADE
      : parsed.data.max_grade === "" || parsed.data.max_grade === undefined
        ? null
        : Number(parsed.data.max_grade);

    let sortOrder = parsed.data.sort_order ?? 0;
    if (parsed.data.sort_order === undefined) {
      const existing = await classTaskRepository.listClassTasksByClassId(
        adminClient,
        input.class_id
      );
      if (existing.error) {
        return { success: false, error: existing.error.message };
      }
      sortOrder =
        (existing.data ?? []).reduce(
          (max, row) => Math.max(max, row.sort_order),
          -1
        ) + 1;
    }

    const { data, error } = await timer.step("createTask", () =>
      classTaskRepository.createClassTask(adminClient, {
        class_id: input.class_id,
        title: parsed.data.title.trim(),
        description: normalizeOptionalString(parsed.data.description),
        period: parsed.data.period,
        max_grade: maxGrade,
        is_yes_no: isYesNo,
        sort_order: sortOrder,
        started: false,
        started_at: null,
        due_date: null,
        created_by: actor.userId,
      })
    );

    if (error || !data) {
      return {
        success: false,
        error: error?.message ?? "Unable to create task.",
      };
    }

    const gradesResult = await timer.step("seedTasks", () =>
      studentTaskRepository.seedStudentTasksForNewTask(adminClient, data.id)
    );
    if (gradesResult.error) {
      return { success: false, error: gradesResult.error.message };
    }

    const studentTaskRecords = gradesResult.data ?? [];
    const [displayByUserId, [task]] = await timer.step("hydrate", () =>
      Promise.all([
        buildStudentDisplayByUserId(
          adminClient,
          studentTaskRecords.map((row) => row.student_id)
        ),
        attachTaskEditorNames(adminClient, [
          mapTaskRecord(data as ClassTaskRecord),
        ]),
      ])
    );
    const studentTasks: ManagerStudentTaskRow[] = studentTaskRecords.map((row) =>
      mapStudentTaskRow(row, displayByUserId)
    );

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "insert",
        severity: "info",
        table_name: "class_tasks",
        record_id: task.id,
        new_data: {
          class_id: task.class_id,
          title: task.title,
          is_yes_no: task.is_yes_no,
          student_task_count: studentTasks.length,
        },
        metadata: { note: "Class task created with pending student rows." },
      })
    );

    return {
      success: true,
      task,
      studentTasks,
      message: "Task created.",
    };
  } finally {
    timer.end();
  }
}

export type UpdateClassTaskResult =
  | {
      success: true;
      task: ManagerClassTaskRow;
      gradesClamped: boolean;
      message: string;
    }
  | MutationFailure;

export type UpdateClassTaskInput = {
  id: string;
  class_id: string;
  title: string;
  description?: string;
  period: string | number;
  max_grade?: string | number;
  is_yes_no?: boolean;
  sort_order: string | number;
};

export async function updateClassTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: UpdateClassTaskInput
): Promise<UpdateClassTaskResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  return applyUpdateClassTask(adminClient, actor, input, (classId) =>
    assertAssignedTeacherForClassMutation(adminClient, actor, classId)
  );
}

/** Shared update core (structure lock, yes/no lock, grade clamping). */
export async function applyUpdateClassTask(
  adminClient: Supabase,
  actor: AuditActor,
  input: UpdateClassTaskInput,
  authorizeClass: ClassMutationAuthorizer
): Promise<UpdateClassTaskResult> {
  if (!isUuid(input.id) || !isUuid(input.class_id)) {
    return { success: false, error: "Task not found." };
  }

  const parsed = updateClassTaskSchema.safeParse({
    title: input.title,
    description: input.description,
    period: input.period,
    max_grade: input.max_grade,
    is_yes_no: input.is_yes_no,
    sort_order: input.sort_order,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingTaskResult = await classTaskRepository.findClassTaskById(
    adminClient,
    input.id
  );
  if (existingTaskResult.error) {
    return { success: false, error: existingTaskResult.error.message };
  }

  const existingTask = existingTaskResult.data;
  if (!existingTask || existingTask.class_id !== input.class_id) {
    return { success: false, error: "Task not found." };
  }

  const scope = await authorizeClass(input.class_id);
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  const structureGuard = await assertClassStructureUnlockedForComputedGrades(
    adminClient,
    input.class_id
  );
  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  const nextIsYesNo = parsed.data.is_yes_no ?? existingTask.is_yes_no;
  if (nextIsYesNo !== existingTask.is_yes_no) {
    const gradedResult =
      await studentTaskRepository.countGradedStudentTasksByTaskId(
        adminClient,
        input.id
      );
    if (gradedResult.error) {
      return { success: false, error: gradedResult.error.message };
    }
    if ((gradedResult.count ?? 0) > 0) {
      return { success: false, error: YES_NO_LOCKED_MESSAGE };
    }
  }

  const nextMaxGrade = nextIsYesNo
    ? YES_NO_MAX_GRADE
    : parseTaskMaxGrade(parsed.data.max_grade);
  const shouldClampGrades = didTaskMaxGradeDecrease(
    existingTask.max_grade,
    nextMaxGrade
  );

  let gradesClamped = false;
  if (shouldClampGrades && nextMaxGrade != null) {
    const clampResult = await studentTaskRepository.clampStudentTaskGradesAboveMax(
      adminClient,
      input.id,
      nextMaxGrade
    );
    if (clampResult.error) {
      return { success: false, error: clampResult.error.message };
    }
    gradesClamped = (clampResult.data?.length ?? 0) > 0;
  }

  const { data, error } = await classTaskRepository.updateClassTaskById(
    adminClient,
    input.id,
    {
      title: parsed.data.title.trim(),
      description: normalizeOptionalString(parsed.data.description),
      period: parsed.data.period,
      max_grade: nextMaxGrade,
      is_yes_no: nextIsYesNo,
      sort_order: parsed.data.sort_order,
      updated_by: actor.userId,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update task.",
    };
  }

  const [task] = await attachTaskEditorNames(adminClient, [
    mapTaskRecord(data as ClassTaskRecord),
  ]);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "class_tasks",
    record_id: task.id,
    old_data: {
      title: existingTask.title,
      description: existingTask.description,
      period: existingTask.period,
      max_grade: existingTask.max_grade,
      is_yes_no: existingTask.is_yes_no,
      sort_order: existingTask.sort_order,
    },
    new_data: {
      title: task.title,
      description: task.description,
      period: task.period,
      max_grade: task.max_grade,
      is_yes_no: task.is_yes_no,
      sort_order: task.sort_order,
    },
    metadata: gradesClamped
      ? {
          note: "Task updated; student grades above the new max were clamped.",
        }
      : { note: "Task updated." },
  });

  return {
    success: true,
    task,
    gradesClamped,
    message: "Task updated.",
  };
}

export type DeleteClassTaskResult =
  | { success: true; classId: string; message: string }
  | MutationFailure;

export async function deleteClassTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { id: string; class_id: string }
): Promise<DeleteClassTaskResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!isUuid(input.id) || !isUuid(input.class_id)) {
    return { success: false, error: "Task not found." };
  }

  const existingTaskResult = await classTaskRepository.findClassTaskById(
    adminClient,
    input.id
  );
  if (existingTaskResult.error) {
    return { success: false, error: existingTaskResult.error.message };
  }

  const existingTask = existingTaskResult.data;
  if (!existingTask || existingTask.class_id !== input.class_id) {
    return { success: false, error: "Task not found." };
  }

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    input.class_id
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  const structureGuard = await assertClassStructureUnlockedForComputedGrades(
    adminClient,
    input.class_id
  );
  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  const existingStudentTasksResult =
    await studentTaskRepository.listStudentTasksByTaskId(adminClient, input.id);
  if (existingStudentTasksResult.error) {
    return { success: false, error: existingStudentTasksResult.error.message };
  }

  const studentTaskIds = (existingStudentTasksResult.data ?? []).map(
    (row) => row.id
  );

  const storageCleanup = await removeStorageForStudentTaskUploads(
    adminClient,
    studentTaskIds
  );
  if (storageCleanup.error) {
    return {
      success: false,
      error:
        storageCleanup.error.message ||
        "Unable to delete student task upload files.",
    };
  }

  const studentTasksResult =
    await studentTaskRepository.deleteStudentTasksByTaskId(
      adminClient,
      input.id
    );
  if (studentTasksResult.error) {
    return { success: false, error: studentTasksResult.error.message };
  }

  const deletedStudentTaskCount = studentTasksResult.data?.length ?? 0;
  const { error: deleteError } = await classTaskRepository.deleteClassTaskById(
    adminClient,
    input.id
  );
  if (deleteError) {
    return {
      success: false,
      error: deleteError.message ?? "Unable to delete task.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "class_tasks",
    record_id: input.id,
    old_data: {
      title: existingTask.title,
      class_id: existingTask.class_id,
      max_grade: existingTask.max_grade,
      student_task_count: deletedStudentTaskCount,
    },
    metadata: { note: "Class task deleted with student task rows." },
  });

  return {
    success: true,
    classId: input.class_id,
    message: "Task deleted.",
  };
}

export type SetClassTaskStartedResult =
  | { success: true; task: ManagerClassTaskRow; message: string }
  | MutationFailure;

export type SetClassTaskStartedInput = {
  id: string;
  class_id: string;
  started: boolean;
};

export async function setClassTaskStartedForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: SetClassTaskStartedInput
): Promise<SetClassTaskStartedResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  return applyClassTaskStart(adminClient, actor, input, (classId) =>
    assertAssignedTeacherForClassMutation(adminClient, actor, classId)
  );
}

/** Shared start/unstart core (structure lock, unstart guard, due date). */
export async function applyClassTaskStart(
  adminClient: Supabase,
  actor: AuditActor,
  input: SetClassTaskStartedInput,
  authorizeClass: ClassMutationAuthorizer
): Promise<SetClassTaskStartedResult> {
  if (!isUuid(input.id) || !isUuid(input.class_id)) {
    return { success: false, error: "Task not found." };
  }

  const existingTaskResult = await classTaskRepository.findClassTaskById(
    adminClient,
    input.id
  );
  if (existingTaskResult.error) {
    return { success: false, error: existingTaskResult.error.message };
  }

  const existingTask = existingTaskResult.data;
  if (!existingTask || existingTask.class_id !== input.class_id) {
    return { success: false, error: "Task not found." };
  }

  const scope = await authorizeClass(input.class_id);
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  if (existingTask.started === input.started) {
    return {
      success: true,
      task: mapTaskRecord(existingTask as ClassTaskRecord),
      message: input.started ? "Task already started." : "Task already not started.",
    };
  }

  const structureGuard = await assertClassStructureUnlockedForComputedGrades(
    adminClient,
    input.class_id
  );
  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  if (!input.started) {
    const studentTasksResult =
      await studentTaskRepository.listStudentTasksByTaskId(adminClient, input.id);
    if (studentTasksResult.error) {
      return { success: false, error: studentTasksResult.error.message };
    }
    const blocking = (studentTasksResult.data ?? []).filter(
      (row) => row.status !== STUDENT_TASK_STATUSES.PENDING
    );
    if (blocking.length > 0) {
      return {
        success: false,
        error:
          "Cannot unstart this task while students have submitted, graded, late, or missing work.",
      };
    }
  }

  const startedAt = input.started ? new Date().toISOString() : null;
  const dueDate =
    input.started && startedAt
      ? addDaysIso(startedAt, existingTask.period)
      : null;

  const { data, error } = await classTaskRepository.updateClassTaskStartState(
    adminClient,
    input.id,
    {
      started: input.started,
      started_at: startedAt,
      due_date: dueDate,
      updated_by: actor.userId,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update task start state.",
    };
  }

  const [task] = await attachTaskEditorNames(adminClient, [
    mapTaskRecord(data as ClassTaskRecord),
  ]);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "class_tasks",
    record_id: task.id,
    old_data: {
      started: existingTask.started,
      started_at: existingTask.started_at,
      due_date: existingTask.due_date,
    },
    new_data: {
      started: task.started,
      started_at: task.started_at,
      due_date: task.due_date,
    },
    metadata: {
      note: input.started ? "Class task started." : "Class task unstarted.",
    },
  });

  return {
    success: true,
    task,
    message: input.started ? "Task started." : "Task unstarted.",
  };
}

export type ImportClassTasksResult =
  | {
      success: true;
      tasks: ManagerClassTaskRow[];
      importedCount: number;
      skippedCount: number;
      message: string;
    }
  | MutationFailure;

export async function importSubjectTasksForClassForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: { class_id: string }
): Promise<ImportClassTasksResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!isUuid(input.class_id)) {
    return { success: false, error: "Class not found." };
  }

  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    input.class_id
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }

  const classResult = await classRepository.findClassDetailById(
    adminClient,
    input.class_id
  );
  if (classResult.error) {
    return { success: false, error: classResult.error.message };
  }
  if (!classResult.data) {
    return { success: false, error: "Class not found." };
  }
  if (!classResult.data.subject_id) {
    return { success: false, error: "Class has no subject to import from." };
  }

  const structureGuard = await assertClassStructureUnlockedForComputedGrades(
    adminClient,
    input.class_id
  );
  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  const imported = await importMissingSubjectTasksToClass(
    adminClient,
    input.class_id,
    classResult.data.subject_id
  );
  if (imported.error) {
    return { success: false, error: imported.error };
  }

  const tasks = imported.data.map((row) => mapTaskRecord(row));

  for (const task of imported.data) {
    const seed = await studentTaskRepository.seedStudentTasksForNewTask(
      adminClient,
      task.id
    );
    if (seed.error) {
      return { success: false, error: seed.error.message };
    }
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "class_tasks",
    record_id: input.class_id,
    new_data: {
      imported_count: tasks.length,
      skipped_count: imported.skipped,
    },
    metadata: { note: "Imported missing subject tasks onto class." },
  });

  return {
    success: true,
    tasks,
    importedCount: tasks.length,
    skippedCount: imported.skipped,
    message:
      tasks.length === 0
        ? "No new subject tasks to import."
        : `Imported ${tasks.length} task(s) from subject.`,
  };
}

export type UpdateStudentTaskResult =
  | {
      success: true;
      studentTask: ManagerStudentTaskRow;
      message: string;
      classId: string | null;
    }
  | MutationFailure;

export async function updateStudentTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    status: string;
    grade?: string | number;
    notes?: string;
    student_report?: string;
    submitted_at?: string;
  }
): Promise<UpdateStudentTaskResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_UPDATE_STUDENT
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const existing = await studentTaskRepository.findStudentTaskById(
    adminClient,
    input.id
  );
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Student task not found." };
  }

  const taskResult = await classTaskRepository.findClassTaskById(
    adminClient,
    existing.data.task_id
  );
  if (taskResult.error) {
    return { success: false, error: taskResult.error.message };
  }
  if (!taskResult.data) {
    return { success: false, error: "Task not found." };
  }

  const classId = taskResult.data.class_id;
  const scope = await assertAssignedTeacherForClassMutation(
    adminClient,
    actor,
    classId
  );
  if (!scope.ok) {
    return { success: false, error: scope.error };
  }
  const studentGuard = await assertStudentGradeInputsUnlockedForComputedGrade(
    adminClient,
    classId,
    existing.data.student_id
  );
  if (!studentGuard.ok) {
    return { success: false, error: studentGuard.error };
  }

  const parsed = createEditStudentTaskSchema(
    taskResult.data.max_grade,
    taskResult.data.due_date,
    { isYesNo: taskResult.data.is_yes_no }
  ).safeParse({
    status: input.status,
    grade: input.grade,
    notes: input.notes,
    student_report: input.student_report,
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

  const { data, error } = await studentTaskRepository.updateStudentTask(
    adminClient,
    input.id,
    {
      status: parsed.data.status,
      grade,
      notes: normalizeOptionalString(parsed.data.notes),
      student_report: normalizeOptionalString(parsed.data.student_report),
      submitted_at: toIsoOrNull(parsed.data.submitted_at),
      graded_at: shouldSetGradedAt ? gradedAt : null,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update student task.",
    };
  }

  const displayByUserId = await buildStudentDisplayByUserId(adminClient, [
    data.student_id,
  ]);

  const studentTask = mapStudentTaskRow(
    data as StudentTaskRecord,
    displayByUserId
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_tasks",
    record_id: studentTask.id,
    old_data: {
      status: existing.data.status,
      grade: existing.data.grade,
      student_report: existing.data.student_report,
    },
    new_data: {
      status: studentTask.status,
      grade: studentTask.grade,
      student_report: studentTask.student_report,
    },
  });

  return {
    success: true,
    studentTask,
    message: "Student task updated.",
    classId,
  };
}

/** Used by create-class / subject-replace — no auth (caller already authorized). */
export async function cloneSubjectTasksOntoClass(
  adminClient: Supabase,
  classId: string,
  subjectId: string
): Promise<{ error: string | null; count: number }> {
  const result = await cloneAllSubjectTasksToClass(
    adminClient,
    classId,
    subjectId
  );
  if (result.error) {
    return { error: result.error, count: 0 };
  }
  return { error: null, count: result.data.length };
}
