import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { createSessionTaskSchema } from "@/lib/validators/manager/create-session-task";
import type { FieldErrors } from "@/types/auth";

export const updateSessionTaskSchema = createSessionTaskSchema;

export type UpdateSessionTaskInput = z.infer<typeof updateSessionTaskSchema>;

export function parseUpdateSessionTaskFormData(formData: FormData):
  | {
      success: true;
      data: UpdateSessionTaskInput & {
        id: string;
        class_id: string;
        session_id: string;
      };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const id = String(formData.get("id") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "").trim();
  const session_id = String(formData.get("session_id") ?? "").trim();

  if (!id) {
    return { success: false, error: "Task id is required." };
  }

  if (!class_id || !session_id) {
    return { success: false, error: "Class and session are required." };
  }

  const parsed = updateSessionTaskSchema.safeParse({
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
      class_id,
      session_id,
      ...parsed.data,
    },
  };
}
