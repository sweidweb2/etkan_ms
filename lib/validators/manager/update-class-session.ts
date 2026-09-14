import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { createClassSessionSchema } from "@/lib/validators/manager/create-class-session";
import type { FieldErrors } from "@/types/auth";

export const updateClassSessionSchema = createClassSessionSchema;

export type UpdateClassSessionInput = z.infer<typeof updateClassSessionSchema>;

export function parseUpdateClassSessionFormData(formData: FormData):
  | {
      success: true;
      data: UpdateClassSessionInput & {
        class_id: string;
        session_id: string;
      };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const class_id = String(formData.get("class_id") ?? "").trim();
  const session_id = String(formData.get("session_id") ?? "").trim();

  if (!class_id) {
    return { success: false, error: "Class is required." };
  }

  if (!session_id) {
    return { success: false, error: "Session is required." };
  }

  const parsed = updateClassSessionSchema.safeParse({
    topic: formData.get("topic"),
    session_report: formData.get("session_report") ?? undefined,
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
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
      class_id,
      session_id,
      ...parsed.data,
    },
  };
}
