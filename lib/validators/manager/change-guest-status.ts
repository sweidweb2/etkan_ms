import { z } from "zod";
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

export const changeGuestStatusSchema = z.object({
  id: z.string().uuid({ message: "Invalid guest id." }),
  status: z.enum(GUEST_PIPELINE_STATUS_VALUES, {
    message: "Select a valid pipeline status.",
  }),
  note: optionalNote,
});

export type ChangeGuestStatusInput = z.infer<typeof changeGuestStatusSchema>;

export function parseChangeGuestStatusFormData(formData: FormData):
  | { success: true; data: ChangeGuestStatusInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = changeGuestStatusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}
