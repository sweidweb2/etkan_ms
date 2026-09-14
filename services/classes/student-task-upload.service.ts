import { PERMISSIONS } from "@/lib/constants/permissions";
import { STUDENT_TASK_UPLOAD_MAX_FILES } from "@/lib/constants/manager-student-task-uploads";
import { buildStudentTaskUploadStoragePath } from "@/lib/manager/student-tasks/storage-path";
import {
  deleteStudentTaskUploadSchema,
  studentTaskUploadSignedUrlSchema,
  uploadStudentTaskFileSchema,
} from "@/lib/validators/manager/student-task-upload";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as studentTaskStorageRepository from "@/repositories/student-task-storage.repository";
import * as studentTaskUploadRepository from "@/repositories/student-task-upload.repository";
import type { StudentTaskUploadRecord } from "@/repositories/student-task-upload.repository";
import * as taskRepository from "@/repositories/task.repository";
import {
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { assertStudentGradeInputsUnlockedForComputedGrade } from "@/services/classes/class-computed-grade-lock.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerStudentTaskUploadRow } from "@/types/manager-class-session-detail";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type MutationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

function mapStudentTaskUploadRecord(
  row: StudentTaskUploadRecord
): ManagerStudentTaskUploadRow {
  return {
    id: row.id,
    student_task_id: row.student_task_id,
    storage_path: row.storage_path,
    file_name: row.file_name,
    mime_type: row.mime_type,
    file_size: row.file_size,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
  };
}

async function resolveClassIdForStudentTask(
  adminClient: Supabase,
  taskId: string
): Promise<
  | { ok: true; classId: string | null; sessionId: string | null }
  | { ok: false; error: string }
> {
  const taskResult = await taskRepository.findTaskById(adminClient, taskId);

  if (taskResult.error) {
    return { ok: false, error: taskResult.error.message };
  }

  if (!taskResult.data) {
    return { ok: false, error: "Task not found." };
  }

  const sessionId = taskResult.data.session_id;

  if (!sessionId) {
    return { ok: true, classId: null, sessionId: null };
  }

  const sessionResult = await sessionRepository.findSessionById(
    adminClient,
    sessionId
  );

  if (sessionResult.error) {
    return { ok: false, error: sessionResult.error.message };
  }

  return {
    ok: true,
    classId: sessionResult.data?.class_id ?? null,
    sessionId,
  };
}

export type UploadStudentTaskFileResult =
  | {
      success: true;
      upload: ManagerStudentTaskUploadRow;
      message: string;
      classId: string | null;
      sessionId: string | null;
      taskId: string;
    }
  | MutationFailure;

export async function uploadStudentTaskFileForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<UploadStudentTaskFileResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_UPDATE_STUDENT
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = uploadStudentTaskFileSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const studentTaskResult = await studentTaskRepository.findStudentTaskById(
    adminClient,
    dataInput.student_task_id
  );

  if (studentTaskResult.error) {
    return {
      success: false,
      error: studentTaskResult.error.message || "Unable to upload file.",
    };
  }

  if (!studentTaskResult.data) {
    return { success: false, error: "Student task not found." };
  }

  const context = await resolveClassIdForStudentTask(
    adminClient,
    studentTaskResult.data.task_id
  );

  if (!context.ok) {
    return { success: false, error: context.error };
  }

  if (context.classId) {
    const studentGuard = await assertStudentGradeInputsUnlockedForComputedGrade(
      adminClient,
      context.classId,
      studentTaskResult.data.student_id
    );

    if (!studentGuard.ok) {
      return { success: false, error: studentGuard.error };
    }
  }

  const countResult =
    await studentTaskUploadRepository.countStudentTaskUploadsByStudentTaskId(
      adminClient,
      dataInput.student_task_id
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
      error: `Each student task can have at most ${STUDENT_TASK_UPLOAD_MAX_FILES} uploads.`,
    };
  }

  const storagePath = buildStudentTaskUploadStoragePath(
    dataInput.student_task_id,
    dataInput.file.name
  );
  const contentType = dataInput.file.type.trim();
  const fileBytes = await dataInput.file.arrayBuffer();

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
      student_task_id: dataInput.student_task_id,
      storage_path: storagePath,
      file_name: dataInput.file.name.trim(),
      mime_type: contentType,
      file_size: dataInput.file.size,
      uploaded_by: actorUserId,
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

  const upload = mapStudentTaskUploadRecord(data as StudentTaskUploadRecord);

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
    classId: context.classId,
    sessionId: context.sessionId,
    taskId: studentTaskResult.data.task_id,
  };
}

export type DeleteStudentTaskUploadResult =
  | {
      success: true;
      uploadId: string;
      message: string;
      classId: string | null;
      sessionId: string | null;
      taskId: string;
    }
  | MutationFailure;

export async function deleteStudentTaskUploadForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<DeleteStudentTaskUploadResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_UPDATE_STUDENT
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

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
      error: existing.error.message || "Unable to delete upload.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Upload not found." };
  }

  const studentTaskResult = await studentTaskRepository.findStudentTaskById(
    adminClient,
    existing.data.student_task_id
  );

  if (studentTaskResult.error) {
    return {
      success: false,
      error: studentTaskResult.error.message || "Unable to delete upload.",
    };
  }

  if (!studentTaskResult.data) {
    return { success: false, error: "Student task not found." };
  }

  const context = await resolveClassIdForStudentTask(
    adminClient,
    studentTaskResult.data.task_id
  );

  if (!context.ok) {
    return { success: false, error: context.error };
  }

  if (context.classId) {
    const studentGuard = await assertStudentGradeInputsUnlockedForComputedGrade(
      adminClient,
      context.classId,
      studentTaskResult.data.student_id
    );

    if (!studentGuard.ok) {
      return { success: false, error: studentGuard.error };
    }
  }

  const storageResult =
    await studentTaskStorageRepository.removeStudentTaskStorageObjects(
      adminClient,
      [existing.data.storage_path]
    );

  if (storageResult.error) {
    return {
      success: false,
      error: storageResult.error.message || "Unable to delete upload file.",
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
      error: error.message || "Unable to delete upload.",
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
    message: "Upload deleted.",
    classId: context.classId,
    sessionId: context.sessionId,
    taskId: studentTaskResult.data.task_id,
  };
}

export type StudentTaskUploadSignedUrlResult =
  | { success: true; signedUrl: string }
  | MutationFailure;

export async function getStudentTaskUploadSignedUrlForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: unknown
): Promise<StudentTaskUploadSignedUrlResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.TASKS_VIEW
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = studentTaskUploadSignedUrlSchema.safeParse(input);

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
      error: existing.error.message || "Unable to open file.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Upload not found." };
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

/**
 * Best-effort storage cleanup for uploads belonging to student_task ids
 * that are about to be deleted with a session task.
 */
export async function removeStorageForStudentTaskUploads(
  adminClient: Supabase,
  studentTaskIds: string[]
): Promise<{ error: { message: string } | null }> {
  if (studentTaskIds.length === 0) {
    return { error: null };
  }

  const uploadsResult =
    await studentTaskUploadRepository.listStudentTaskUploadsByStudentTaskIds(
      adminClient,
      studentTaskIds
    );

  if (uploadsResult.error) {
    return { error: { message: uploadsResult.error.message } };
  }

  const paths = (uploadsResult.data ?? []).map((row) => row.storage_path);
  return studentTaskStorageRepository.removeStudentTaskStorageObjects(
    adminClient,
    paths
  );
}
