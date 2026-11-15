import { inspectStudentTaskUploadBytes } from "@/lib/manager/student-tasks/inspect-upload-bytes";
import type { TaskAttachmentAllowedMimeType } from "@/lib/constants/task-attachments";

/**
 * Authoritative content sniff for task-definition attachments.
 * Same allowlist / sniffing as student task uploads.
 */
export async function inspectTaskAttachmentBytes(
  bytes: Buffer
): Promise<
  | { ok: true; mime: TaskAttachmentAllowedMimeType }
  | { ok: false; error: string }
> {
  const result = await inspectStudentTaskUploadBytes(bytes);
  if (!result.ok) {
    return result;
  }
  return { ok: true, mime: result.mime as TaskAttachmentAllowedMimeType };
}
