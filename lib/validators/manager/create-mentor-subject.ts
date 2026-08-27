import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createMentorSubjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Mentor subject name is required." })
    .max(120, {
      message: "Mentor subject name must be at most 120 characters.",
    }),
});

export type CreateMentorSubjectInput = z.infer<typeof createMentorSubjectSchema>;

export function parseCreateMentorSubjectFormData(formData: FormData):
  | { success: true; data: CreateMentorSubjectInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createMentorSubjectSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(flattened),
    };
  }

  return { success: true, data: parsed.data };
}
