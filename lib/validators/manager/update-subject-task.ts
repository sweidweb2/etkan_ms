import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { subjectTaskFieldsSchema } from "@/lib/validators/manager/create-subject-task";
import type { FieldErrors } from "@/types/auth";

export const updateSubjectTaskSchema = subjectTaskFieldsSchema.extend({
  id: z.string().uuid({ message: "Task not found." }),
  subject_id: z.string().uuid({ message: "Subject not found." }),
});

export type UpdateSubjectTaskInput = z.infer<typeof updateSubjectTaskSchema>;

export function parseUpdateSubjectTaskFormData(formData: FormData):
  | { success: true; data: UpdateSubjectTaskInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const id = String(formData.get("id") ?? "").trim();
  const subject_id = String(formData.get("subject_id") ?? "").trim();

  if (!id) {
    return { success: false, error: "Task id is required." };
  }
  if (!subject_id) {
    return { success: false, error: "Subject is required." };
  }

  return safeParseFormData(updateSubjectTaskSchema, {
    id,
    subject_id,
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    period: formData.get("period"),
    max_grade: formData.get("max_grade") ?? undefined,
    sort_order: formData.get("sort_order") ?? "0",
  });
}
