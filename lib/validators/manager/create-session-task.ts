import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createSessionTaskSchema = z.object({
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
  due_date: z.string().trim().optional(),
  max_grade: z
    .union([
      z.literal(""),
      z.coerce
        .number()
        .min(0, { message: "Max grade must be at least 0." })
        .max(999, { message: "Max grade must be at most 999." }),
    ])
    .optional(),
});

export type CreateSessionTaskInput = z.infer<typeof createSessionTaskSchema>;

export function parseCreateSessionTaskFormData(formData: FormData):
  | {
      success: true;
      data: CreateSessionTaskInput & {
        session_id: string;
        class_id: string;
      };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const session_id = String(formData.get("session_id") ?? "").trim();
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!session_id || !class_id) {
    return { success: false, error: "Session and class are required." };
  }

  const parsed = createSessionTaskSchema.safeParse({
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
      session_id,
      class_id,
      ...parsed.data,
    },
  };
}
