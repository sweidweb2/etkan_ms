import { createClassTaskSchema } from "@/lib/validators/manager/create-class-task";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { parseTaskYesNoFormValue } from "@/lib/validators/manager/task-yes-no";
import type { FieldErrors } from "@/types/auth";
import { z } from "zod";

export const updateClassTaskSchema = createClassTaskSchema.extend({
  sort_order: z.coerce
    .number()
    .int({ message: "Sort order must be a whole number." })
    .min(0, { message: "Sort order must be at least 0." }),
});

export type UpdateClassTaskInput = z.infer<typeof updateClassTaskSchema>;

export function parseUpdateClassTaskFormData(formData: FormData):
  | {
      success: true;
      data: UpdateClassTaskInput & { id: string; class_id: string };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const id = String(formData.get("id") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!id || !class_id) {
    return { success: false, error: "Task and class are required." };
  }

  const parsed = updateClassTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    period: formData.get("period"),
    max_grade: formData.get("max_grade") ?? undefined,
    is_yes_no: parseTaskYesNoFormValue(formData.get("is_yes_no")),
    sort_order: formData.get("sort_order") ?? 0,
  });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return {
    success: true,
    data: {
      id,
      class_id,
      ...parsed.data,
    },
  };
}
