import {
  TASK_ATTACHMENTS_STORAGE_BUCKET,
  type TaskAttachmentEntity,
} from "@/lib/constants/task-attachments";

const MAX_SAFE_NAME_LENGTH = 120;

/**
 * Sanitize an upload filename for Storage object keys.
 * Strips path segments, keeps [a-zA-Z0-9._-], collapses runs of separators.
 */
export function sanitizeTaskAttachmentFileName(
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
 * Object key inside the private `task-attachments` bucket:
 * `{entity}/{entityId}/{uuid}-{safeName}`
 *
 * Full logical path used in DB `storage_path` includes the bucket prefix:
 * `task-attachments/{entity}/{entityId}/{uuid}-{safeName}`
 */
export function buildTaskAttachmentStoragePath(
  entity: TaskAttachmentEntity,
  entityId: string,
  originalFileName: string,
  objectId: string = crypto.randomUUID()
): string {
  const safeName = sanitizeTaskAttachmentFileName(originalFileName);
  return `${TASK_ATTACHMENTS_STORAGE_BUCKET}/${entity}/${entityId}/${objectId}-${safeName}`;
}

/**
 * Returns bucket id and object key for Supabase Storage APIs.
 * `storagePath` is the DB value from `buildTaskAttachmentStoragePath`.
 */
export function splitTaskAttachmentStoragePath(storagePath: string): {
  bucket: string;
  objectPath: string;
} {
  const prefix = `${TASK_ATTACHMENTS_STORAGE_BUCKET}/`;
  if (!storagePath.startsWith(prefix)) {
    return {
      bucket: TASK_ATTACHMENTS_STORAGE_BUCKET,
      objectPath: storagePath,
    };
  }
  return {
    bucket: TASK_ATTACHMENTS_STORAGE_BUCKET,
    objectPath: storagePath.slice(prefix.length),
  };
}
