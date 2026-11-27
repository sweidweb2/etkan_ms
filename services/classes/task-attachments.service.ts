import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  TASK_ATTACHMENT_ENTITIES,
  TASK_ATTACHMENT_MAX_FILES,
  type TaskAttachmentEntity,
} from "@/lib/constants/task-attachments";
import { inspectTaskAttachmentBytes } from "@/lib/manager/task-attachments/inspect-upload-bytes";
import { buildTaskAttachmentStoragePath } from "@/lib/manager/task-attachments/storage-path";
import {
  deleteTaskAttachmentSchema,
  taskAttachmentSignedUrlSchema,
  uploadTaskAttachmentSchema,
} from "@/lib/validators/manager/task-attachment";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import * as classTaskRepository from "@/repositories/class-task.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as subjectTaskRepository from "@/repositories/subject-task.repository";
import * as taskAttachmentRepository from "@/repositories/task-attachment.repository";
import type { TaskAttachmentRecord } from "@/repositories/task-attachment.repository";
import * as taskAttachmentStorageRepository from "@/repositories/task-attachment-storage.repository";
import {
  assertStudentSelfAccess,
  getUnauthorizedError,
  hasPermission,
  UNAUTHORIZED_MESSAGE,
} from "@/services/auth/authorization.service";
import {
  assertTeamLeaderForClass,
  assertTeamLeaderTaskAccessForClass,
} from "@/services/classes/class-team-leader.service";
import {
  getLatestCloneJobForClassTask,
  isCloneJobBlockingUploads,
  scheduleAttachmentCloneProcessing,
} from "@/services/classes/task-attachment-clone.service";
import { assertAssignedTeacherForClassMutation } from "@/services/classes/teacher-class-scope.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type {
  TaskAttachmentCloneJobRow,
  TaskAttachmentRow,
} from "@/types/task-attachment";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

function mapAttachment(row: TaskAttachmentRecord): TaskAttachmentRow {
  return {
    id: row.id,
    entity: row.entity as TaskAttachmentEntity,
    entity_id: row.entity_id,
    file_name: row.file_name,
    mime_type: row.mime_type,
    file_size: row.file_size,
    uploaded_by: row.uploaded_by,
    sort_order: row.sort_order,
    created_at: row.created_at,
  };
}

function mapCloneJob(
  row: NonNullable<Awaited<ReturnType<typeof getLatestCloneJobForClassTask>>>
): TaskAttachmentCloneJobRow {
  return {
    id: row.id,
    class_task_id: row.class_task_id,
    source_subject_task_id: row.source_subject_task_id,
    status: row.status,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
  };
}

async function assertCanViewEntity(
  adminClient: Supabase,
  actorUserId: string | null,
  entity: TaskAttachmentEntity,
  entityId: string
): Promise<{ ok: true; classId?: string } | { ok: false; error: string }> {
  if (entity === TASK_ATTACHMENT_ENTITIES.SUBJECT_TASK) {
    const unauthorized = await getUnauthorizedError(
      adminClient,
      actorUserId,
      PERMISSIONS.SUBJECTS_TASKS_VIEW
    );
    if (unauthorized) {
      return { ok: false, error: unauthorized };
    }
    const task = await subjectTaskRepository.findSubjectTaskById(
      adminClient,
      entityId
    );
    if (task.error) {
      return { ok: false, error: task.error.message };
    }
    if (!task.data) {
      return { ok: false, error: "Subject task not found." };
    }
    return { ok: true };
  }

  const task = await classTaskRepository.findClassTaskById(adminClient, entityId);
  if (task.error) {
    return { ok: false, error: task.error.message };
  }
  if (!task.data) {
    return { ok: false, error: "Task not found." };
  }

  const canViewTasks =
    actorUserId &&
    (await hasPermission(adminClient, actorUserId, PERMISSIONS.TASKS_VIEW));

  if (canViewTasks) {
    return { ok: true, classId: task.data.class_id };
  }

  if (actorUserId) {
    const teamLeader = await assertTeamLeaderTaskAccessForClass(
      adminClient,
      actorUserId,
      task.data.class_id
    );
    if (teamLeader.ok) {
      return { ok: true, classId: task.data.class_id };
    }
  }

  return { ok: false, error: UNAUTHORIZED_MESSAGE };
}

async function assertCanMutateEntity(
  adminClient: Supabase,
  actor: AuditActor,
  entity: TaskAttachmentEntity,
  entityId: string
): Promise<{ ok: true; classId?: string } | { ok: false; error: string }> {
  if (entity === TASK_ATTACHMENT_ENTITIES.SUBJECT_TASK) {
    const unauthorized = await getUnauthorizedError(
      adminClient,
      actor.userId,
      PERMISSIONS.SUBJECTS_TASKS_UPDATE
    );
    if (unauthorized) {
      return { ok: false, error: unauthorized };
    }
    const task = await subjectTaskRepository.findSubjectTaskById(
      adminClient,
      entityId
    );
    if (task.error) {
      return { ok: false, error: task.error.message };
    }
    if (!task.data) {
      return { ok: false, error: "Subject task not found." };
    }
    return { ok: true };
  }

  const task = await classTaskRepository.findClassTaskById(adminClient, entityId);
  if (task.error) {
    return { ok: false, error: task.error.message };
  }
  if (!task.data) {
    return { ok: false, error: "Task not found." };
  }

  const canUpdate =
    actor.userId &&
    (await hasPermission(adminClient, actor.userId, PERMISSIONS.TASKS_UPDATE));

  if (canUpdate) {
    const scope = await assertAssignedTeacherForClassMutation(
      adminClient,
      actor,
      task.data.class_id
    );
    if (!scope.ok) {
      return { ok: false, error: scope.error };
    }
    return { ok: true, classId: task.data.class_id };
  }

  const teamLeader = await assertTeamLeaderForClass(
    adminClient,
    actor.userId,
    task.data.class_id,
    PERMISSIONS.TEAM_LEADER_TASKS_UPDATE
  );
  if (teamLeader.ok) {
    return { ok: true, classId: task.data.class_id };
  }

  return { ok: false, error: UNAUTHORIZED_MESSAGE };
}

export async function listTaskAttachmentsUnchecked(
  adminClient: Supabase,
  entity: TaskAttachmentEntity,
  entityId: string
): Promise<TaskAttachmentRow[]> {
  const result = await taskAttachmentRepository.listTaskAttachmentsByEntity(
    adminClient,
    entity,
    entityId
  );
  if (result.error) {
    throw new Error(result.error.message);
  }
  return ((result.data ?? []) as TaskAttachmentRecord[]).map(mapAttachment);
}

export async function listTaskAttachmentsByEntityIdsUnchecked(
  adminClient: Supabase,
  entity: TaskAttachmentEntity,
  entityIds: string[]
): Promise<TaskAttachmentRow[]> {
  const result = await taskAttachmentRepository.listTaskAttachmentsByEntityIds(
    adminClient,
    entity,
    entityIds
  );
  if (result.error) {
    throw new Error(result.error.message);
  }
  return ((result.data ?? []) as TaskAttachmentRecord[]).map(mapAttachment);
}

export async function getClassTaskAttachmentCloneJobForActor(
  adminClient: Supabase,
  actorUserId: string | null,
  classTaskId: string
): Promise<TaskAttachmentCloneJobRow | null> {
  const gate = await assertCanViewEntity(
    adminClient,
    actorUserId,
    TASK_ATTACHMENT_ENTITIES.CLASS_TASK,
    classTaskId
  );
  if (!gate.ok) {
    throw new Error(gate.error);
  }

  const job = await getLatestCloneJobForClassTask(adminClient, classTaskId);
  if (!job) {
    return null;
  }

  if (isCloneJobBlockingUploads(job.status)) {
    scheduleAttachmentCloneProcessing(adminClient);
  }

  return mapCloneJob(job);
}

export type UploadTaskAttachmentResult =
  | {
      success: true;
      attachment: TaskAttachmentRow;
      message: string;
      classId: string | null;
      subjectId: string | null;
    }
  | MutationFailure;

export async function uploadTaskAttachmentForActor(
  adminClient: Supabase,
  actor: AuditActor,
  input: unknown
): Promise<UploadTaskAttachmentResult> {
  const parsed = uploadTaskAttachmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;
  const gate = await assertCanMutateEntity(
    adminClient,
    actor,
    dataInput.entity,
    dataInput.entity_id
  );
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  if (dataInput.entity === TASK_ATTACHMENT_ENTITIES.CLASS_TASK) {
    const openJob = await getLatestCloneJobForClassTask(
      adminClient,
      dataInput.entity_id
    );
    if (openJob && isCloneJobBlockingUploads(openJob.status)) {
      scheduleAttachmentCloneProcessing(adminClient);
      return {
        success: false,
        error:
          "Attachments are still being copied from the subject. Try again shortly.",
      };
    }
  }

  const countResult = await taskAttachmentRepository.countTaskAttachmentsByEntity(
    adminClient,
    dataInput.entity,
    dataInput.entity_id
  );
  if (countResult.error) {
    return {
      success: false,
      error: countResult.error.message || "Unable to upload file.",
    };
  }
  if ((countResult.count ?? 0) >= TASK_ATTACHMENT_MAX_FILES) {
    return {
      success: false,
      error: `Each task can have at most ${TASK_ATTACHMENT_MAX_FILES} attachments.`,
    };
  }

  const storagePath = buildTaskAttachmentStoragePath(
    dataInput.entity,
    dataInput.entity_id,
    dataInput.file.name
  );
  const fileBytes = Buffer.from(await dataInput.file.arrayBuffer());
  const inspected = await inspectTaskAttachmentBytes(fileBytes);
  if (!inspected.ok) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { file: [inspected.error] },
    };
  }

  const uploadResult =
    await taskAttachmentStorageRepository.uploadTaskAttachmentStorageObject(
      adminClient,
      storagePath,
      fileBytes,
      inspected.mime
    );
  if (uploadResult.error) {
    return {
      success: false,
      error: uploadResult.error.message || "Unable to upload file.",
    };
  }

  const created = await taskAttachmentRepository.createTaskAttachment(
    adminClient,
    {
      entity: dataInput.entity,
      entity_id: dataInput.entity_id,
      storage_path: storagePath,
      file_name: dataInput.file.name.trim(),
      mime_type: inspected.mime,
      file_size: dataInput.file.size,
      uploaded_by: actor.userId,
      sort_order: countResult.count ?? 0,
    }
  );

  if (created.error || !created.data) {
    await taskAttachmentStorageRepository.removeTaskAttachmentStorageObjects(
      adminClient,
      [storagePath]
    );
    return {
      success: false,
      error: created.error?.message || "Unable to save attachment.",
    };
  }

  const attachment = mapAttachment(created.data as TaskAttachmentRecord);

  const classId: string | null = gate.classId ?? null;
  let subjectId: string | null = null;
  if (attachment.entity === TASK_ATTACHMENT_ENTITIES.SUBJECT_TASK) {
    const subjectTask = await subjectTaskRepository.findSubjectTaskById(
      adminClient,
      attachment.entity_id
    );
    subjectId = subjectTask.data?.subject_id ?? null;
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "task_attachments",
    record_id: attachment.id,
    new_data: {
      entity: attachment.entity,
      entity_id: attachment.entity_id,
      file_name: attachment.file_name,
      file_size: attachment.file_size,
    },
    metadata: { note: "Task attachment uploaded." },
  });

  return {
    success: true,
    attachment,
    message: "File was uploaded.",
    classId,
    subjectId,
  };
}

export type DeleteTaskAttachmentResult =
  | {
      success: true;
      message: string;
      classId: string | null;
      subjectId: string | null;
      entity: TaskAttachmentEntity;
      entityId: string;
    }
  | MutationFailure;

export async function deleteTaskAttachmentForActor(
  adminClient: Supabase,
  actor: AuditActor,
  input: unknown
): Promise<DeleteTaskAttachmentResult> {
  const parsed = deleteTaskAttachmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const existing = await taskAttachmentRepository.findTaskAttachmentById(
    adminClient,
    parsed.data.id
  );
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Attachment not found." };
  }

  const row = existing.data as TaskAttachmentRecord;
  const gate = await assertCanMutateEntity(
    adminClient,
    actor,
    row.entity as TaskAttachmentEntity,
    row.entity_id
  );
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const deleted = await taskAttachmentRepository.deleteTaskAttachmentById(
    adminClient,
    row.id
  );
  if (deleted.error) {
    return {
      success: false,
      error: deleted.error.message || "Unable to delete attachment.",
    };
  }

  // Prefer orphaned storage over a DB row pointing at a missing object.
  await taskAttachmentStorageRepository.removeTaskAttachmentStorageObjects(
    adminClient,
    [row.storage_path]
  );

  const classId: string | null = gate.classId ?? null;
  let subjectId: string | null = null;
  if (row.entity === TASK_ATTACHMENT_ENTITIES.SUBJECT_TASK) {
    const subjectTask = await subjectTaskRepository.findSubjectTaskById(
      adminClient,
      row.entity_id
    );
    subjectId = subjectTask.data?.subject_id ?? null;
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "task_attachments",
    record_id: row.id,
    old_data: {
      entity: row.entity,
      entity_id: row.entity_id,
      file_name: row.file_name,
    },
    metadata: { note: "Task attachment deleted." },
  });

  return {
    success: true,
    message: "File was deleted.",
    classId,
    subjectId,
    entity: row.entity as TaskAttachmentEntity,
    entityId: row.entity_id,
  };
}

export type TaskAttachmentSignedUrlResult =
  | { success: true; signedUrl: string; fileName: string }
  | MutationFailure;

export async function getTaskAttachmentSignedUrlForActor(
  adminClient: Supabase,
  actorUserId: string | null,
  input: unknown
): Promise<TaskAttachmentSignedUrlResult> {
  const parsed = taskAttachmentSignedUrlSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const existing = await taskAttachmentRepository.findTaskAttachmentById(
    adminClient,
    parsed.data.id
  );
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Attachment not found." };
  }

  const row = existing.data as TaskAttachmentRecord;
  const gate = await assertCanViewEntity(
    adminClient,
    actorUserId,
    row.entity as TaskAttachmentEntity,
    row.entity_id
  );
  if (!gate.ok) {
    return { success: false, error: gate.error };
  }

  const signed =
    await taskAttachmentStorageRepository.createTaskAttachmentSignedUrl(
      adminClient,
      row.storage_path
    );
  if (signed.error || !signed.data) {
    return {
      success: false,
      error: signed.error?.message || "Unable to open file.",
    };
  }

  return {
    success: true,
    signedUrl: signed.data.signedUrl,
    fileName: row.file_name,
  };
}

/**
 * Student read access: class task must be started and student enrolled.
 */
export async function listClassTaskAttachmentsForStudent(
  adminClient: Supabase,
  studentUserId: string,
  classTaskId: string
): Promise<TaskAttachmentRow[]> {
  await assertStudentSelfAccess(adminClient, studentUserId);

  const task = await classTaskRepository.findClassTaskById(
    adminClient,
    classTaskId
  );
  if (task.error) {
    throw new Error(task.error.message);
  }
  if (!task.data) {
    throw new Error("Task not found.");
  }
  if (!task.data.started) {
    return [];
  }

  const membership = await studentClassRepository.findStudentClassByUserAndClass(
    adminClient,
    studentUserId,
    task.data.class_id
  );
  if (membership.error) {
    throw new Error(membership.error.message);
  }
  if (!membership.data) {
    throw new Error(UNAUTHORIZED_MESSAGE);
  }

  return listTaskAttachmentsUnchecked(
    adminClient,
    TASK_ATTACHMENT_ENTITIES.CLASS_TASK,
    classTaskId
  );
}

export async function getTaskAttachmentSignedUrlForStudent(
  adminClient: Supabase,
  studentUserId: string,
  input: unknown
): Promise<TaskAttachmentSignedUrlResult> {
  await assertStudentSelfAccess(adminClient, studentUserId);

  const parsed = taskAttachmentSignedUrlSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const existing = await taskAttachmentRepository.findTaskAttachmentById(
    adminClient,
    parsed.data.id
  );
  if (existing.error) {
    return { success: false, error: existing.error.message };
  }
  if (!existing.data) {
    return { success: false, error: "Attachment not found." };
  }

  const row = existing.data as TaskAttachmentRecord;
  if (row.entity !== TASK_ATTACHMENT_ENTITIES.CLASS_TASK) {
    return { success: false, error: UNAUTHORIZED_MESSAGE };
  }

  const task = await classTaskRepository.findClassTaskById(
    adminClient,
    row.entity_id
  );
  if (task.error) {
    return { success: false, error: task.error.message };
  }
  if (!task.data?.started) {
    return { success: false, error: "This task has not started yet." };
  }

  const membership = await studentClassRepository.findStudentClassByUserAndClass(
    adminClient,
    studentUserId,
    task.data.class_id
  );
  if (membership.error) {
    return { success: false, error: membership.error.message };
  }
  if (!membership.data) {
    return { success: false, error: UNAUTHORIZED_MESSAGE };
  }

  const signed =
    await taskAttachmentStorageRepository.createTaskAttachmentSignedUrl(
      adminClient,
      row.storage_path
    );
  if (signed.error || !signed.data) {
    return {
      success: false,
      error: signed.error?.message || "Unable to open file.",
    };
  }

  return {
    success: true,
    signedUrl: signed.data.signedUrl,
    fileName: row.file_name,
  };
}

/**
 * Best-effort storage + row cleanup for task-definition attachments.
 */
export async function removeStorageAndRowsForTaskAttachments(
  adminClient: Supabase,
  entity: TaskAttachmentEntity,
  entityIds: string[]
): Promise<{ error: { message: string } | null }> {
  if (entityIds.length === 0) {
    return { error: null };
  }

  const listed =
    await taskAttachmentRepository.listTaskAttachmentStoragePathsByEntityIds(
      adminClient,
      entity,
      entityIds
    );
  if (listed.error) {
    return { error: { message: listed.error.message } };
  }

  const paths = (listed.data ?? []).map((row) => row.storage_path);

  for (const entityId of entityIds) {
    const deleted = await taskAttachmentRepository.deleteTaskAttachmentsByEntity(
      adminClient,
      entity,
      entityId
    );
    if (deleted.error) {
      return { error: { message: deleted.error.message } };
    }
  }

  // Prefer orphaned storage over dangling DB rows after a cascade delete.
  await taskAttachmentStorageRepository.removeTaskAttachmentStorageObjects(
    adminClient,
    paths
  );

  return { error: null };
}
