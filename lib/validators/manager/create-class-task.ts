import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  parseTaskYesNoFormValue,
  taskYesNoFieldSchema,
} from "@/lib/validators/manager/task-yes-no";
import type { FieldErrors } from "@/types/auth";

export const createClassTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Task title is required." })
    .max(120, { message: "Title must be at most 120 characters." }),
  description: z
    .string()
    .trim()
    .max(500, { message: "Description must be at most 500 characters." })
    .optional(),
  period: z.coerce
    .number({ message: "Period is required." })
    .int({ message: "Period must be a whole number of days." })
    .min(1, { message: "Period must be at least 1 day." })
    .max(3650, { message: "Period must be at most 3650 days." }),
  max_grade: z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .min(0, { message: "Max grade must be at least 0." })
        .max(999, { message: "Max grade must be at most 999." }),
    ])
    .optional(),
  is_yes_no: taskYesNoFieldSchema,
  sort_order: z.coerce
    .number()
    .int({ message: "Sort order must be a whole number." })
    .min(0, { message: "Sort order must be at least 0." })
    .optional(),
});

export type CreateClassTaskInput = z.infer<typeof createClassTaskSchema>;

export function parseCreateClassTaskFormData(formData: FormData):
  | {
      success: true;
      data: CreateClassTaskInput & { class_id: string };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!class_id) {
    return { success: false, error: "Class is required." };
  }

  const parsed = createClassTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    period: formData.get("period"),
    max_grade: formData.get("max_grade") ?? undefined,
    is_yes_no: parseTaskYesNoFormValue(formData.get("is_yes_no")),
    sort_order: formData.get("sort_order") ?? undefined,
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return {
    success: true,
    data: {
      class_id,
      ...parsed.data,
    },
  };
}
