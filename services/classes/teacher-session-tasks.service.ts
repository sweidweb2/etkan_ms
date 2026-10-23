import * as sessionRepository from "@/repositories/session.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as studentTaskUploadRepository from "@/repositories/student-task-upload.repository";
import * as taskRepository from "@/repositories/task.repository";
import {
  UNAUTHORIZED_MESSAGE,
} from "@/services/auth/authorization.service";
import { getClassComputedGradeLockStateForManager } from "@/services/classes/class-computed-grade-lock.service";
import type { Supabase } from "@/services/classes/class-shared";
import {
  getSessionDetailForManager,
  getSessionTaskDetailForManager,
} from "@/services/classes/session-queries.service";
import {
  createSessionTaskForManager,
  deleteSessionTaskForManager,
  updateSessionTaskForManager,
  updateStudentTaskForManager,
} from "@/services/classes/session-tasks.service";
import {
  deleteStudentTaskUploadForManager,
  getStudentTaskUploadSignedUrlForManager,
  uploadStudentTaskFileForManager,
} from "@/services/classes/student-task-upload.service";
import { assertTeacherAssignedToClass } from "@/services/classes/teacher-class-self.service";
import type { AuditActor } from "@/services/ops/audit-log.service";

async function resolveClassIdForTaskId(
  adminClient: Supabase,
  taskId: string
): Promise<string | null> {
  const taskResult = await taskRepository.findTaskById(adminClient, taskId);
  if (taskResult.error) {
    throw new Error(taskResult.error.message);
  }
  if (!taskResult.data?.session_id) {
    return null;
  }

  const sessionResult = await sessionRepository.findSessionById(
    adminClient,
    taskResult.data.session_id
  );
  if (sessionResult.error) {
    throw new Error(sessionResult.error.message);
  }

  return sessionResult.data?.class_id ?? null;
}

async function assertTeacherAssignedViaStudentTaskId(
  adminClient: Supabase,
  actorUserId: string | null,
  studentTaskId: string
): Promise<void> {
  const existing = await studentTaskRepository.findStudentTaskById(
    adminClient,
    studentTaskId
  );
  if (existing.error) {
    throw new Error(existing.error.message);
  }
  if (!existing.data) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }

  const classId = await resolveClassIdForTaskId(
    adminClient,
    existing.data.task_id
  );
  if (!classId) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }

  await assertTeacherAssignedToClass(adminClient, actorUserId, classId);
}

export async function getSessionDetailForTeacher(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  sessionId: string
) {
  await assertTeacherAssignedToClass(adminClient, actorUserId, classId);
  return getSessionDetailForManager(
    adminClient,
    actorUserId,
    classId,
    sessionId
  );
}

export async function getSessionTaskDetailForTeacher(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string,
  sessionId: string,
  taskId: string
) {
  await assertTeacherAssignedToClass(adminClient, actorUserId, classId);
  return getSessionTaskDetailForManager(
    adminClient,
    actorUserId,
    classId,
    sessionId,
    taskId
  );
}

export async function getClassComputedGradeLockStateForTeacher(
  adminClient: Supabase,
  actorUserId: string | null,
  classId: string
) {
  await assertTeacherAssignedToClass(adminClient, actorUserId, classId);
  return getClassComputedGradeLockStateForManager(
    adminClient,
    actorUserId,
    classId
  );
}

export async function createSessionTaskForTeacher(
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
) {
  await assertTeacherAssignedToClass(adminClient, actorUserId, input.class_id);
  return createSessionTaskForManager(adminClient, actorUserId, actor, input);
}

export async function updateSessionTaskForTeacher(
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
) {
  await assertTeacherAssignedToClass(adminClient, actorUserId, input.class_id);
  return updateSessionTaskForManager(adminClient, actorUserId, actor, input);
}

export async function deleteSessionTaskForTeacher(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    class_id: string;
    session_id: string;
  }
) {
  await assertTeacherAssignedToClass(adminClient, actorUserId, input.class_id);
  return deleteSessionTaskForManager(adminClient, actorUserId, actor, input);
}

export async function updateStudentTaskForTeacher(
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
) {
  await assertTeacherAssignedViaStudentTaskId(
    adminClient,
    actorUserId,
    input.id
  );
  return updateStudentTaskForManager(adminClient, actorUserId, actor, input);
}

export async function uploadStudentTaskFileForTeacher(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
) {
  const studentTaskId =
    input &&
    typeof input === "object" &&
    "student_task_id" in input &&
    typeof (input as { student_task_id?: unknown }).student_task_id === "string"
      ? (input as { student_task_id: string }).student_task_id
      : null;

  if (studentTaskId) {
    await assertTeacherAssignedViaStudentTaskId(
      adminClient,
      actorUserId,
      studentTaskId
    );
  }

  return uploadStudentTaskFileForManager(
    adminClient,
    actorUserId,
    actor,
    input
  );
}

async function assertTeacherAssignedViaUploadId(
  adminClient: Supabase,
  actorUserId: string | null,
  uploadId: string
): Promise<void> {
  const existing = await studentTaskUploadRepository.findStudentTaskUploadById(
    adminClient,
    uploadId
  );
  if (existing.error) {
    throw new Error(existing.error.message);
  }
  if (!existing.data) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }

  await assertTeacherAssignedViaStudentTaskId(
    adminClient,
    actorUserId,
    existing.data.student_task_id
  );
}

export async function deleteStudentTaskUploadForTeacher(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
) {
  const uploadId =
    input &&
    typeof input === "object" &&
    "id" in input &&
    typeof (input as { id?: unknown }).id === "string"
      ? (input as { id: string }).id
      : null;

  if (uploadId) {
    await assertTeacherAssignedViaUploadId(adminClient, actorUserId, uploadId);
  }

  return deleteStudentTaskUploadForManager(
    adminClient,
    actorUserId,
    actor,
    input
  );
}

export async function getStudentTaskUploadSignedUrlForTeacher(
  adminClient: Supabase,
  actorUserId: string | null,
  input: unknown
) {
  const uploadId =
    input &&
    typeof input === "object" &&
    "id" in input &&
    typeof (input as { id?: unknown }).id === "string"
      ? (input as { id: string }).id
      : null;

  if (uploadId) {
    await assertTeacherAssignedViaUploadId(adminClient, actorUserId, uploadId);
  }

  return getStudentTaskUploadSignedUrlForManager(
    adminClient,
    actorUserId,
    input
  );
}
