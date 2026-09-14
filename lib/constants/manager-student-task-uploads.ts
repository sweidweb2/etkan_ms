export const STUDENT_TASK_UPLOADS_STORAGE_BUCKET = "student-task-uploads";

export const STUDENT_TASK_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export const STUDENT_TASK_UPLOAD_MAX_FILES = 10;

export const STUDENT_TASK_UPLOAD_ALLOWED_MIME_TYPES = [
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

export type StudentTaskUploadAllowedMimeType =
  (typeof STUDENT_TASK_UPLOAD_ALLOWED_MIME_TYPES)[number];

export const STUDENT_TASK_UPLOAD_ACCEPT =
  STUDENT_TASK_UPLOAD_ALLOWED_MIME_TYPES.join(",");

export const STUDENT_TASK_UPLOAD_SIGNED_URL_EXPIRES_SECONDS = 60 * 10;
