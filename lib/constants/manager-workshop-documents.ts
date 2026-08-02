export const WORKSHOP_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const WORKSHOP_DOCUMENT_ALLOWED_MIME_TYPES = [
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

export type WorkshopDocumentAllowedMimeType =
  (typeof WORKSHOP_DOCUMENT_ALLOWED_MIME_TYPES)[number];

export const WORKSHOP_DOCUMENT_ACCEPT = WORKSHOP_DOCUMENT_ALLOWED_MIME_TYPES.join(
  ","
);

export const WORKSHOP_DOCUMENT_MAX_NAME_LENGTH = 200;
