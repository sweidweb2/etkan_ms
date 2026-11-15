export const TASK_ATTACHMENTS_STORAGE_BUCKET = "task-attachments";

export const TASK_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const TASK_ATTACHMENT_MAX_FILES = 10;

export const TASK_ATTACHMENT_ENTITIES = {
  SUBJECT_TASK: "subject_task",
  CLASS_TASK: "class_task",
} as const;

export type TaskAttachmentEntity =
  (typeof TASK_ATTACHMENT_ENTITIES)[keyof typeof TASK_ATTACHMENT_ENTITIES];

export const TASK_ATTACHMENT_CLONE_JOB_STATUSES = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type TaskAttachmentCloneJobStatus =
  (typeof TASK_ATTACHMENT_CLONE_JOB_STATUSES)[keyof typeof TASK_ATTACHMENT_CLONE_JOB_STATUSES];

export const TASK_ATTACHMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

export type TaskAttachmentAllowedMimeType =
  (typeof TASK_ATTACHMENT_ALLOWED_MIME_TYPES)[number];

export const TASK_ATTACHMENT_ACCEPT =
  TASK_ATTACHMENT_ALLOWED_MIME_TYPES.join(",");

export const TASK_ATTACHMENT_SIGNED_URL_EXPIRES_SECONDS = 60 * 10;
