import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  STUDENT_TASK_STATUSES,
} from "@/lib/constants/manager-student-task-status";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { createSessionTaskSchema } from "@/lib/validators/manager/create-session-task";
import { updateSessionTaskSchema } from "@/lib/validators/manager/update-session-task";
import { createEditStudentTaskSchema } from "@/lib/validators/manager/edit-student-task";
import { updateAttendeeSchema } from "@/lib/validators/manager/update-attendee";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import type { StudentTaskRecord } from "@/repositories/student-task.repository";
import * as taskRepository from "@/repositories/task.repository";
import type { TaskRecord } from "@/repositories/task.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  assertClassStructureUnlockedForComputedGrades,
  assertStudentGradeInputsUnlockedForComputedGrade,
} from "@/services/classes/class-computed-grade-lock.service";
import { removeStorageForStudentTaskUploads } from "@/services/classes/student-task-upload.service";
import {
  buildStudentDisplayByUserId,
  didTaskMaxGradeDecrease,
  isUuid,
  mapAttendeeStatus,
  mapStudentTaskRow,
  mapTaskRecord,
  normalizeOptionalString,
  parseTaskMaxGrade,
  toIsoOrNull,
  type MutationFailure,
  type Supabase,
} from "@/services/classes/session-shared";
import type { AttendeeStatusValue } from "@/lib/constants/manager-attendee-status";
import type {
  ManagerSessionAttendeeRow,
  ManagerSessionTaskRow,
  ManagerStudentTaskRow,
} from "@/types/manager-class-session-detail";

export type CreateSessionTaskResult =
  | {
      success: true;
      task: ManagerSessionTaskRow;
      studentTasks: ManagerStudentTaskRow[];
      message: string;
    }
  | MutationFailure;

export async function createSessionTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    class_id: string;
    session_id: string;
    title: string;
    description?: string;
    due_date?: string;
    max_grade?: string | number;
  }
): Promise<CreateSessionTaskResult> {
  const timer = createNavStepTimer("createSessionTask");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.TASKS_CREATE)
    );
    if (unauthorized) {
      return { success: false, error: unauthorized };
    }

    const parsed = createSessionTaskSchema.safeParse({
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

    const sessionResult = await timer.step("session", () =>
      sessionRepository.findSessionById(adminClient, input.session_id)
    );

    if (sessionResult.error) {
      return { success: false, error: sessionResult.error.message };
    }

    if (!sessionResult.data || sessionResult.data.class_id !== input.class_id) {
      return { success: false, error: "Session not found." };
    }

    const structureGuard = await timer.step("structureGuard", () =>
      assertClassStructureUnlockedForComputedGrades(adminClient, input.class_id)
    );

    if (!structureGuard.ok) {
      return { success: false, error: structureGuard.error };
    }

    const maxGrade =
      parsed.data.max_grade === "" || parsed.data.max_grade === undefined
        ? null
        : Number(parsed.data.max_grade);

    const { data, error } = await timer.step("createTask", () =>
      taskRepository.createTask(adminClient, {
        session_id: input.session_id,
        title: parsed.data.title.trim(),
        description: normalizeOptionalString(parsed.data.description),
        due_date: toIsoOrNull(parsed.data.due_date),
        max_grade: maxGrade,
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
    const displayByUserId = await timer.step("hydrate", () =>
      buildStudentDisplayByUserId(
        adminClient,
        studentTaskRecords.map((row) => row.student_id)
      )
    );

    const task = mapTaskRecord(data as TaskRecord);
    const studentTasks: ManagerStudentTaskRow[] = studentTaskRecords.map((row) =>
      mapStudentTaskRow(row, displayByUserId)
    );

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "insert",
        severity: "info",
        table_name: "tasks",
        record_id: task.id,
        new_data: {
          session_id: task.session_id,
          title: task.title,
          student_task_count: studentTasks.length,
        },
        metadata: { note: "Session task created with pending student rows." },
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

export type UpdateSessionTaskResult =
  | {
      success: true;
      task: ManagerSessionTaskRow;
      gradesClamped: boolean;
      message: string;
    }
  | MutationFailure;

export async function updateSessionTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    class_id: string;
    session_id: string;
    title: string;
    description?: string;
    due_date?: string;
    max_grade?: string | number;
  }
): Promise<UpdateSessionTaskResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (!isUuid(input.id) || !isUuid(input.class_id) || !isUuid(input.session_id)) {
    return { success: false, error: "Task not found." };
  }

  const parsed = updateSessionTaskSchema.safeParse({
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

  const [existingTaskResult, sessionResult] = await Promise.all([
    taskRepository.findTaskById(adminClient, input.id),
    sessionRepository.findSessionById(adminClient, input.session_id),
  ]);

  if (existingTaskResult.error) {
    return { success: false, error: existingTaskResult.error.message };
  }

  if (sessionResult.error) {
    return { success: false, error: sessionResult.error.message };
  }

  const existingTask = existingTaskResult.data;
  const session = sessionResult.data;

  if (
    !existingTask ||
    !session ||
    session.class_id !== input.class_id ||
    existingTask.session_id !== input.session_id
  ) {
    return { success: false, error: "Task not found." };
  }

  const structureGuard = await assertClassStructureUnlockedForComputedGrades(
    adminClient,
    input.class_id
  );

  if (!structureGuard.ok) {
    return { success: false, error: structureGuard.error };
  }

  const nextMaxGrade = parseTaskMaxGrade(parsed.data.max_grade);
  const previousMaxGrade = existingTask.max_grade;
  const shouldClampGrades = didTaskMaxGradeDecrease(
    previousMaxGrade,
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

  const { data, error } = await taskRepository.updateTask(adminClient, input.id, {
    title: parsed.data.title.trim(),
    description: normalizeOptionalString(parsed.data.description),
    due_date: toIsoOrNull(parsed.data.due_date),
    max_grade: nextMaxGrade,
  });

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update task.",
    };
  }

  const task = mapTaskRecord(data as TaskRecord);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "tasks",
    record_id: task.id,
    old_data: {
      title: existingTask.title,
      description: existingTask.description,
      due_date: existingTask.due_date,
      max_grade: existingTask.max_grade,
    },
    new_data: {
      title: task.title,
      description: task.description,
      due_date: task.due_date,
      max_grade: task.max_grade,
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

export type DeleteSessionTaskResult =
  | {
      success: true;
      classId: string;
      sessionId: string;
      message: string;
    }
  | MutationFailure;

export async function deleteSessionTaskForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    class_id: string;
    session_id: string;
  }
): Promise<DeleteSessionTaskResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  if (
    !isUuid(input.id) ||
    !isUuid(input.class_id) ||
    !isUuid(input.session_id)
  ) {
    return { success: false, error: "Task not found." };
  }

  const [existingTaskResult, sessionResult] = await Promise.all([
    taskRepository.findTaskById(adminClient, input.id),
    sessionRepository.findSessionById(adminClient, input.session_id),
  ]);

  if (existingTaskResult.error) {
    return { success: false, error: existingTaskResult.error.message };
  }

  if (sessionResult.error) {
    return { success: false, error: sessionResult.error.message };
  }

  const existingTask = existingTaskResult.data;
  const session = sessionResult.data;

  if (
    !existingTask ||
    !session ||
    session.class_id !== input.class_id ||
    existingTask.session_id !== input.session_id
  ) {
    return { success: false, error: "Task not found." };
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

  const { error: deleteError } = await taskRepository.deleteTaskById(
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
    table_name: "tasks",
    record_id: input.id,
    old_data: {
      title: existingTask.title,
      session_id: existingTask.session_id,
      max_grade: existingTask.max_grade,
      student_task_count: deletedStudentTaskCount,
    },
    metadata: {
      note: "Session task deleted with student task rows.",
    },
  });

  return {
    success: true,
    classId: input.class_id,
    sessionId: input.session_id,
    message: "Task deleted.",
  };
}

export type UpdateAttendeeResult =
  | {
      success: true;
      attendee: ManagerSessionAttendeeRow;
      message: string;
    }
  | MutationFailure;

/**
 * Update an existing attendee row. No membership gate: former members keep
 * historical rows and those rows remain editable.
 */
export async function updateAttendeeForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    class_id: string;
    session_id: string;
    status: AttendeeStatusValue;
    note?: string;
  }
): Promise<UpdateAttendeeResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.ATTENDANCE_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateAttendeeSchema.safeParse({
    status: input.status,
    note: input.note,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [existing, sessionResult] = await Promise.all([
    attendeeRepository.findAttendeeById(adminClient, input.id),
    sessionRepository.findSessionById(adminClient, input.session_id),
  ]);

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data || existing.data.session_id !== input.session_id) {
    return { success: false, error: "Attendee not found." };
  }

  if (sessionResult.error) {
    return { success: false, error: sessionResult.error.message };
  }

  if (!sessionResult.data || sessionResult.data.class_id !== input.class_id) {
    return { success: false, error: "Session not found." };
  }

  const studentGuard = await assertStudentGradeInputsUnlockedForComputedGrade(
    adminClient,
    input.class_id,
    existing.data.student_id
  );

  if (!studentGuard.ok) {
    return { success: false, error: studentGuard.error };
  }

  const { data, error } = await attendeeRepository.updateAttendee(
    adminClient,
    input.id,
    {
      status: parsed.data.status,
      note:
        parsed.data.note !== undefined
          ? normalizeOptionalString(parsed.data.note)
          : existing.data.note,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: error?.message ?? "Unable to update attendance.",
    };
  }

  const displayByUserId = await buildStudentDisplayByUserId(adminClient, [
    data.student_id,
  ]);
  const display = displayByUserId.get(data.student_id);

  const attendee: ManagerSessionAttendeeRow = {
    id: data.id,
    session_id: data.session_id,
    student_id: data.student_id,
    full_name: display?.full_name ?? "Unknown student",
    email: display?.email ?? "",
    note: data.note,
    status: mapAttendeeStatus(data.status),
    created_at: data.created_at,
  };

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "attendee",
    record_id: attendee.id,
    old_data: {
      status: existing.data.status,
      note: existing.data.note,
    },
    new_data: {
      status: attendee.status,
      note: attendee.note,
    },
  });

  return {
    success: true,
    attendee,
    message: "Attendance updated.",
  };
}

export type UpdateStudentTaskResult =
  | {
      success: true;
      studentTask: ManagerStudentTaskRow;
      message: string;
      classId: string | null;
      sessionId: string | null;
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
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.TASKS_UPDATE_STUDENT);
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

  const taskResult = await taskRepository.findTaskById(
    adminClient,
    existing.data.task_id
  );

  if (taskResult.error) {
    return { success: false, error: taskResult.error.message };
  }

  if (!taskResult.data) {
    return { success: false, error: "Task not found." };
  }

  let classId: string | null = null;
  const sessionId = taskResult.data.session_id;

  if (sessionId) {
    const sessionResult = await sessionRepository.findSessionById(
      adminClient,
      sessionId
    );

    if (sessionResult.error) {
      return { success: false, error: sessionResult.error.message };
    }

    if (sessionResult.data) {
      classId = sessionResult.data.class_id;
    }
  }

  if (classId) {
    const studentGuard = await assertStudentGradeInputsUnlockedForComputedGrade(
      adminClient,
      classId,
      existing.data.student_id
    );

    if (!studentGuard.ok) {
      return { success: false, error: studentGuard.error };
    }
  }

  const parsed = createEditStudentTaskSchema(
    taskResult.data.max_grade,
    taskResult.data.due_date
  ).safeParse(
    {
      status: input.status,
      grade: input.grade,
      notes: input.notes,
      student_report: input.student_report,
      submitted_at: input.submitted_at,
    }
  );

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
    sessionId,
  };
}
