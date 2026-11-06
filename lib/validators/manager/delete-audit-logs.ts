import { z } from "zod";
import {
  formValidationFailure,
  safeParseFormData,
} from "@/lib/validators/safe-parse-form-data";

export const MAX_AUDIT_LOGS_PER_DELETE = 500;

export const deleteAuditLogsSchema = z.object({
  ids: z
    .array(z.string().trim().uuid({ message: "Invalid log id." }))
    .min(1, { message: "Select at least one log to delete." })
    .max(MAX_AUDIT_LOGS_PER_DELETE, {
      message: `You can delete up to ${MAX_AUDIT_LOGS_PER_DELETE} logs at once.`,
    }),
});

export type DeleteAuditLogsInput = z.infer<typeof deleteAuditLogsSchema>;

export function parseDeleteAuditLogsFormData(formData: FormData) {
  const ids = [
    ...new Set(
      formData
        .getAll("ids")
        .map((value) => String(value).trim())
        .filter(Boolean)
    ),
  ];

  if (ids.length === 0) {
    return formValidationFailure(undefined, "Select at least one log to delete.");
  }

  if (ids.length > MAX_AUDIT_LOGS_PER_DELETE) {
    return formValidationFailure(
      undefined,
      `You can delete up to ${MAX_AUDIT_LOGS_PER_DELETE} logs at once.`
    );
  }

  return safeParseFormData(deleteAuditLogsSchema, { ids });
}
