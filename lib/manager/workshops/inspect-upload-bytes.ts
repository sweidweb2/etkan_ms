import { inspectStudentTaskUploadBytes } from "@/lib/manager/student-tasks/inspect-upload-bytes";
import type { WorkshopDocumentAllowedMimeType } from "@/lib/constants/manager-workshop-documents";

/**
 * Authoritative content sniff for workshop documents.
 * Same allowlist / sniffing as student task uploads and task attachments.
 */
export async function inspectWorkshopDocumentBytes(
  bytes: Buffer
): Promise<
  | { ok: true; mime: WorkshopDocumentAllowedMimeType }
  | { ok: false; error: string }
> {
  const result = await inspectStudentTaskUploadBytes(bytes);
  if (!result.ok) {
    return result;
  }
  return { ok: true, mime: result.mime as WorkshopDocumentAllowedMimeType };
}
