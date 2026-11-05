import { z } from "zod";
import { CLASS_SESSION_SKIP_REASON_MAX_LENGTH } from "@/lib/constants/class-session-skips";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

const isoDateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Week date is invalid." });

export const skipClassWeekSchema = z.object({
  class_id: z.string().trim().uuid({ message: "Class is required." }),
  skip_date: isoDateSchema,
  session_id: z
    .string()
    .trim()
    .refine((value) => value === "" || z.string().uuid().safeParse(value).success, {
      message: "Session is invalid.",
    })
    .optional(),
  reason: z
    .string()
    .trim()
    .max(CLASS_SESSION_SKIP_REASON_MAX_LENGTH, {
      message: `Reason must be at most ${CLASS_SESSION_SKIP_REASON_MAX_LENGTH} characters.`,
    })
    .optional(),
});

export type SkipClassWeekInput = z.infer<typeof skipClassWeekSchema>;

export const unskipClassWeekSchema = z.object({
  class_id: z.string().trim().uuid({ message: "Class is required." }),
  skip_date: isoDateSchema,
});

export type UnskipClassWeekInput = z.infer<typeof unskipClassWeekSchema>;

export function parseSkipClassWeekFormData(formData: FormData) {
  return safeParseFormData(skipClassWeekSchema, {
    class_id: formData.get("class_id"),
    skip_date: formData.get("skip_date"),
    session_id: formData.get("session_id") ?? "",
    reason: formData.get("reason") ?? "",
  });
}

export function parseUnskipClassWeekFormData(formData: FormData) {
  return safeParseFormData(unskipClassWeekSchema, {
    class_id: formData.get("class_id"),
    skip_date: formData.get("skip_date"),
  });
}
