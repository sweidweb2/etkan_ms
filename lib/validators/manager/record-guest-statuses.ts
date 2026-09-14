import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { GUEST_PIPELINE_STATUS_VALUES } from "@/lib/constants/guest";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

const NOTE_MAX = 2000;

const optionalNote = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}, z
  .string()
  .max(NOTE_MAX, {
    message: `Note must be at most ${NOTE_MAX} characters.`,
  })
  .nullable());

export const recordGuestStatusesSchema = z.object({
  id: z.string().uuid({ message: "Invalid guest id." }),
  statuses: z
    .array(
      z.enum(GUEST_PIPELINE_STATUS_VALUES, {
        message: "Select a valid pipeline status.",
      })
    )
    .min(1, { message: "Select at least one status." }),
  note: optionalNote,
});

export type RecordGuestStatusesInput = z.infer<typeof recordGuestStatusesSchema>;

export function parseRecordGuestStatusesFormData(formData: FormData):
  | { success: true; data: RecordGuestStatusesInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const statuses = formData
    .getAll("statuses")
    .map((value) => String(value).trim())
    .filter(Boolean);

  const parsed = recordGuestStatusesSchema.safeParse({
    id: formData.get("id"),
    statuses,
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return { success: true, data: parsed.data };
}
