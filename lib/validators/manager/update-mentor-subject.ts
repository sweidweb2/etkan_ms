import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const updateMentorSubjectSchema = z.object({
  id: z.string().uuid({ message: "Mentor subject not found." }),
  name: z
    .string()
    .trim()
    .min(1, { message: "Mentor subject name is required." })
    .max(120, {
      message: "Mentor subject name must be at most 120 characters.",
    }),
});

export type UpdateMentorSubjectInput = z.infer<typeof updateMentorSubjectSchema>;

export function parseUpdateMentorSubjectFormData(formData: FormData):
  | { success: true; data: UpdateMentorSubjectInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateMentorSubjectSchema.safeParse({
    id: formData.get("id"),
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
