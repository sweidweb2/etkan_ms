import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { STUDENT_TASK_UPLOAD_MAX_FILES } from "@/lib/constants/manager-student-task-uploads";
import { inspectStudentTaskUploadBytes } from "@/lib/manager/student-tasks/inspect-upload-bytes";
import { buildStudentTaskUploadStoragePath } from "@/lib/manager/student-tasks/storage-path";
import {
  deleteStudentTaskUploadSchema,
  studentTaskUploadSignedUrlSchema,
  uploadStudentTaskFileSchema,
} from "@/lib/validators/manager/student-task-upload";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as studentTaskStorageRepository from "@/repositories/student-task-storage.repository";
import * as studentTaskUploadRepository from "@/repositories/student-task-upload.repository";
import type { StudentTaskUploadRecord } from "@/repositories/student-task-upload.repository";
import {
  assertStudentSelfAccess,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { StudentTaskUploadForSelf } from "@/types/student-class";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export function mapStudentTaskUploadForSelf(
  record: StudentTaskUploadRecord
): StudentTaskUploadForSelf {
  return {
    id: record.id,
    student_task_id: record.student_task_id,
    file_name: record.file_name,
    mime_type: record.mime_type,
    file_size: record.file_size,
    created_at: record.created_at,
  };
}

type OwnStudentTaskContext =
  | {
      ok: true;
      userId: string;
      classId: string;
      taskId: string;
    }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

async function resolveOwnStudentTask(
  adminClient: Supabase,
  actorUserId: string | null,
  studentTaskId: string,
  options?: { requireStarted?: boolean }
): Promise<OwnStudentTaskContext> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_MANAGE_OWN_UPLOADS
  );
  if (unauthorized) {
    return { ok: false, error: unauthorized };
  }

  const userId = await assertStudentSelfAccess(adminClient, actorUserId);

  const ownedTask =
    await studentTaskRepository.findOwnedStudentTaskClassContext(
      adminClient,
      studentTaskId,
      userId
    );

  if (ownedTask.error) {
    return {
      ok: false,
      error: ownedTask.error.message || "Unable to open this task.",
    };
  }

  if (!ownedTask.data) {
    return { ok: false, error: "Task not found." };
  }

  const membership = await studentClassRepository.findStudentClassByUserAndClass(
    adminClient,
    userId,
    ownedTask.data.class_id
  );
  if (membership.error) {
    return {
      ok: false,
      error: membership.error.message || "Unable to open this task.",
    };
  }
  if (!membership.data) {
    return { ok: false, error: "Task not found." };
  }

  if (options?.requireStarted && !ownedTask.data.task_started) {
    return { ok: false, error: "This task has not started yet." };
  }

  return {
    ok: true,
    userId,
    classId: ownedTask.data.class_id,
    taskId: ownedTask.data.task_id,
  };
}

export type UploadStudentTaskFileForSelfResult =
  | {
      success: true;
      upload: StudentTaskUploadForSelf;
      message: string;
      classId: string;
      taskId: string;
    }
  | MutationFailure;

export async function uploadStudentTaskFileForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<UploadStudentTaskFileForSelfResult> {
  const parsed = uploadStudentTaskFileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const owned = await resolveOwnStudentTask(
    adminClient,
    actorUserId,
    parsed.data.student_task_id,
    { requireStarted: true }
  );

  if (!owned.ok) {
    return { success: false, error: owned.error, fieldErrors: owned.fieldErrors };
  }

  const countResult =
    await studentTaskUploadRepository.countStudentTaskUploadsByStudentTaskId(
      adminClient,
      parsed.data.student_task_id
    );

  if (countResult.error) {
    return {
      success: false,
      error: countResult.error.message || "Unable to upload file.",
    };
  }

  if ((countResult.count ?? 0) >= STUDENT_TASK_UPLOAD_MAX_FILES) {
    return {
      success: false,
      error: `Each task can have at most ${STUDENT_TASK_UPLOAD_MAX_FILES} files.`,
    };
  }

  const storagePath = buildStudentTaskUploadStoragePath(
    parsed.data.student_task_id,
    parsed.data.file.name
  );
  const fileBytes = Buffer.from(await parsed.data.file.arrayBuffer());
  const inspected = await inspectStudentTaskUploadBytes(fileBytes);

  if (!inspected.ok) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: { file: [inspected.error] },
    };
  }

  const contentType = inspected.mime;

  const uploadResult =
    await studentTaskStorageRepository.uploadStudentTaskStorageObject(
      adminClient,
      storagePath,
      fileBytes,
      contentType
    );

  if (uploadResult.error) {
    return {
      success: false,
      error: uploadResult.error.message || "Unable to upload file.",
    };
  }

  const { data, error } =
    await studentTaskUploadRepository.createStudentTaskUpload(adminClient, {
      student_task_id: parsed.data.student_task_id,
      storage_path: storagePath,
      file_name: parsed.data.file.name.trim(),
      mime_type: contentType,
      file_size: parsed.data.file.size,
      uploaded_by: owned.userId,
    });

  if (error || !data) {
    await studentTaskStorageRepository.removeStudentTaskStorageObjects(
      adminClient,
      [storagePath]
    );
    return {
      success: false,
      error: error?.message || "Unable to save upload.",
    };
  }

  const upload = mapStudentTaskUploadForSelf(data as StudentTaskUploadRecord);

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "student_task_uploads",
    record_id: upload.id,
    new_data: {
      student_task_id: upload.student_task_id,
      file_name: upload.file_name,
      file_size: upload.file_size,
      mime_type: upload.mime_type,
    },
  });

  return {
    success: true,
    upload,
    message: "File uploaded.",
    classId: owned.classId,
    taskId: owned.taskId,
  };
}

export type DeleteStudentTaskUploadForSelfResult =
  | {
      success: true;
      uploadId: string;
      message: string;
      classId: string;
      taskId: string;
    }
  | MutationFailure;

export async function deleteStudentTaskUploadForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<DeleteStudentTaskUploadForSelfResult> {
  const parsed = deleteStudentTaskUploadSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const existing = await studentTaskUploadRepository.findStudentTaskUploadById(
    adminClient,
    parsed.data.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to delete file.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "File not found." };
  }

  const owned = await resolveOwnStudentTask(
    adminClient,
    actorUserId,
    existing.data.student_task_id,
    { requireStarted: true }
  );

  if (!owned.ok) {
    return { success: false, error: owned.error };
  }

  const storageResult =
    await studentTaskStorageRepository.removeStudentTaskStorageObjects(
      adminClient,
      [existing.data.storage_path]
    );

  if (storageResult.error) {
    return {
      success: false,
      error: storageResult.error.message || "Unable to delete file.",
    };
  }

  const { error } =
    await studentTaskUploadRepository.deleteStudentTaskUploadById(
      adminClient,
      existing.data.id
    );

  if (error) {
    return {
      success: false,
      error: error.message || "Unable to delete file.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "student_task_uploads",
    record_id: existing.data.id,
    old_data: {
      student_task_id: existing.data.student_task_id,
      file_name: existing.data.file_name,
      storage_path: existing.data.storage_path,
    },
  });

  return {
    success: true,
    uploadId: existing.data.id,
    message: "File deleted.",
    classId: owned.classId,
    taskId: owned.taskId,
  };
}

export type StudentTaskUploadSignedUrlForSelfResult =
  | { success: true; signedUrl: string }
  | MutationFailure;

export async function getStudentTaskUploadSignedUrlForSelf(
  adminClient: Supabase,
  actorUserId: string | null,
  input: unknown
): Promise<StudentTaskUploadSignedUrlForSelfResult> {
  const parsed = studentTaskUploadSignedUrlSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Unable to open file.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const existing = await studentTaskUploadRepository.findStudentTaskUploadById(
    adminClient,
    parsed.data.id
  );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to open file.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "File not found." };
  }

  const owned = await resolveOwnStudentTask(
    adminClient,
    actorUserId,
    existing.data.student_task_id
  );

  if (!owned.ok) {
    return { success: false, error: owned.error };
  }

  const signed = await studentTaskStorageRepository.createStudentTaskUploadSignedUrl(
    adminClient,
    existing.data.storage_path
  );

  if (signed.error || !signed.data) {
    return {
      success: false,
      error: signed.error?.message || "Unable to open file.",
    };
  }

  return { success: true, signedUrl: signed.data.signedUrl };
}
