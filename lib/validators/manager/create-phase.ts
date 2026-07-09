import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createPhaseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Semester name is required." })
    .max(120, { message: "Semester name must be at most 120 characters." }),
  nb_courses: z.coerce
    .number()
    .int({ message: "Number of courses must be a whole number." })
    .min(0, { message: "Number of courses must be 0 or greater." })
    .max(1000, { message: "Number of courses must be at most 1000." }),
  amount: z.coerce
    .number()
    .min(0, { message: "Amount must be 0 or greater." })
    .max(1000000, { message: "Amount must be at most 1,000,000." }),
});

export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;

export function parseCreatePhaseFormData(formData: FormData):
  | { success: true; data: CreatePhaseInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createPhaseSchema.safeParse({
    name: formData.get("name"),
    nb_courses: formData.get("nb_courses"),
    amount: formData.get("amount"),
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
