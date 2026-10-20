import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import type { FieldErrors } from "@/types/auth";

/** Shared fields for create and update subject task (no id). */
export const subjectTaskFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Task title is required." })
    .max(200, { message: "Task title must be at most 200 characters." }),
  description: z
    .string()
    .trim()
    .max(2000, { message: "Description must be at most 2000 characters." })
    .optional()
    .or(z.literal("")),
  period: z.coerce
    .number()
    .int({ message: "Period must be a whole number." })
    .positive({ message: "Period must be a positive whole number." }),
  max_grade: z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .min(0, { message: "Max grade must be at least 0." })
        .max(999, { message: "Max grade must be at most 999." }),
    ])
    .optional(),
  sort_order: z.coerce
    .number()
    .int({ message: "Sort order must be a whole number." })
    .min(0, { message: "Sort order must be 0 or greater." }),
});

export const createSubjectTaskSchema = subjectTaskFieldsSchema.extend({
  subject_id: z.string().uuid({ message: "Subject not found." }),
});

export type CreateSubjectTaskInput = z.infer<typeof createSubjectTaskSchema>;

export function parseCreateSubjectTaskFormData(formData: FormData):
  | { success: true; data: CreateSubjectTaskInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const subject_id = String(formData.get("subject_id") ?? "").trim();
  if (!subject_id) {
    return { success: false, error: "Subject is required." };
  }

  return safeParseFormData(createSubjectTaskSchema, {
    subject_id,
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    period: formData.get("period"),
    max_grade: formData.get("max_grade") ?? undefined,
    sort_order: formData.get("sort_order") ?? "0",
  });
}
