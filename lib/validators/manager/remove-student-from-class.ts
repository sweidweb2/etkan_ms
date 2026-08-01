import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const removeStudentFromClassSchema = z.object({
  id: z.string().trim().uuid({ message: "Enrollment is required." }),
  class_id: z.string().trim().uuid({ message: "Class is required." }),
});

export type RemoveStudentFromClassInput = z.infer<
  typeof removeStudentFromClassSchema
>;

export function parseRemoveStudentFromClassFormData(formData: FormData):
  | { success: true; data: RemoveStudentFromClassInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = removeStudentFromClassSchema.safeParse({
    id: formData.get("id"),
    class_id: formData.get("class_id"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}
