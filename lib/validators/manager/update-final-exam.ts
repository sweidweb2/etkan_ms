import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { createFinalExamSchema } from "@/lib/validators/manager/create-final-exam";
import type { FieldErrors } from "@/types/auth";

export const updateFinalExamSchema = createFinalExamSchema;

export type UpdateFinalExamInput = z.infer<typeof updateFinalExamSchema>;

export function parseUpdateFinalExamFormData(formData: FormData):
  | {
      success: true;
      data: UpdateFinalExamInput & { id: string };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    return { success: false, error: "Final exam id is required." };
  }

  const parsed = updateFinalExamSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    due_date: formData.get("due_date") ?? undefined,
    max_grade: formData.get("max_grade") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return {
    success: true,
    data: {
      id,
      ...parsed.data,
    },
  };
}
