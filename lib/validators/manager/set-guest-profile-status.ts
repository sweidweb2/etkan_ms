import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { GUEST_CURRENT_STATUS_VALUES } from "@/lib/constants/guest";

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

export const setGuestProfileStatusSchema = z.object({
  id: z.string().uuid({ message: "Invalid guest id." }),
  status: z.enum(GUEST_CURRENT_STATUS_VALUES, {
    message: "Select a valid guest profile status.",
  }),
  note: optionalNote,
});

export type SetGuestProfileStatusInput = z.infer<
  typeof setGuestProfileStatusSchema
>;

export function parseSetGuestProfileStatusFormData(formData: FormData) {
  return safeParseFormData(setGuestProfileStatusSchema, {
    id: formData.get("id"),
    status: formData.get("status"),
    note: formData.get("note"),
  });
}
