import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const updatePhaseSchema = z.object({
  id: z.string().trim().uuid({ message: "Semester is required." }),
  name: z
    .string()
    .trim()
    .min(1, { message: "Semester name is required." })
    .max(120, { message: "Semester name must be at most 120 characters." }),
});

export type UpdatePhaseInput = z.infer<typeof updatePhaseSchema>;

export function parseUpdatePhaseFormData(formData: FormData):
  | { success: true; data: UpdatePhaseInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updatePhaseSchema.safeParse({
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
