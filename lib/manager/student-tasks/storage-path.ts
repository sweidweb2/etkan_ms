import { STUDENT_TASK_UPLOADS_STORAGE_BUCKET } from "@/lib/constants/manager-student-task-uploads";

const MAX_SAFE_NAME_LENGTH = 120;

/**
 * Sanitize an upload filename for Storage object keys.
 * Strips path segments, keeps [a-zA-Z0-9._-], collapses runs of separators.
 */
export function sanitizeStudentTaskUploadFileName(
  originalFileName: string
): string {
  const base = originalFileName.replace(/\\/g, "/").split("/").pop() ?? "";
  const withoutControl = base.replace(/[\u0000-\u001f\u007f]/g, "");
  const replaced = withoutControl
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/-\./g, ".")
    .replace(/^\.+/, "")
    .replace(/^[.-]+|[.-]+$/g, "");

  const fallback = replaced.length > 0 ? replaced : "file";
  return fallback.slice(0, MAX_SAFE_NAME_LENGTH);
}

/**
 * Object key inside the private `student-task-uploads` bucket:
 * `{studentTaskId}/{uuid}-{safeName}`
 *
 * Full logical path used in DB `storage_path` includes the bucket prefix:
 * `student-task-uploads/{studentTaskId}/{uuid}-{safeName}`
 */
export function buildStudentTaskUploadStoragePath(
  studentTaskId: string,
  originalFileName: string,
  objectId: string = crypto.randomUUID()
): string {
  const safeName = sanitizeStudentTaskUploadFileName(originalFileName);
  return `${STUDENT_TASK_UPLOADS_STORAGE_BUCKET}/${studentTaskId}/${objectId}-${safeName}`;
}

/**
 * Returns bucket id and object key for Supabase Storage APIs.
 * `storagePath` is the DB value from `buildStudentTaskUploadStoragePath`.
 */
export function splitStudentTaskUploadStoragePath(storagePath: string): {
  bucket: string;
  objectPath: string;
} {
  const prefix = `${STUDENT_TASK_UPLOADS_STORAGE_BUCKET}/`;
  if (!storagePath.startsWith(prefix)) {
    return {
      bucket: STUDENT_TASK_UPLOADS_STORAGE_BUCKET,
      objectPath: storagePath,
    };
  }
  return {
    bucket: STUDENT_TASK_UPLOADS_STORAGE_BUCKET,
    objectPath: storagePath.slice(prefix.length),
  };
}
