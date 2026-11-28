import {
  REGISTRATION_DOCUMENT_ALLOWED_MIME_TYPES,
  type RegistrationDocumentAllowedMimeType,
} from "@/lib/constants/public-registration";
import { inspectStudentTaskUploadBytes } from "@/lib/manager/student-tasks/inspect-upload-bytes";

const allowedMimeSet = new Set<string>(REGISTRATION_DOCUMENT_ALLOWED_MIME_TYPES);

/**
 * Authoritative content sniff for registration identity documents.
 * Reuses the shared magic-byte inspector, then restricts to the
 * narrower registration allowlist (PDF + JPEG/PNG/WebP only).
 */
export async function inspectRegistrationDocumentBytes(
  bytes: Buffer
): Promise<
  | { ok: true; mime: RegistrationDocumentAllowedMimeType }
  | { ok: false; error: string }
> {
  const result = await inspectStudentTaskUploadBytes(bytes);
  if (!result.ok) {
    return result;
  }

  if (!allowedMimeSet.has(result.mime)) {
    return { ok: false, error: "File type is not allowed." };
  }

  return {
    ok: true,
    mime: result.mime as RegistrationDocumentAllowedMimeType,
  };
}
