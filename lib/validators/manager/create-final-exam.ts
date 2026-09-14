import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createFinalExamSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { message: "Title is required." })
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

export type CreateFinalExamInput = z.infer<typeof createFinalExamSchema>;

export function parseCreateFinalExamFormData(formData: FormData):
  | {
      success: true;
      data: CreateFinalExamInput & { class_id: string };
    }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const class_id = String(formData.get("class_id") ?? "").trim();

  if (!class_id) {
    return { success: false, error: "Class is required." };
  }

  const parsed = createFinalExamSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") ?? undefined,
    due_date: formData.get("due_date") ?? undefined,
    max_grade: formData.get("max_grade") ?? undefined,
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
