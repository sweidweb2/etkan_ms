import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const updatePhaseSchema = z.object({
  id: z.string().trim().uuid({ message: "Semester is required." }),
  name: z
    .string()
    .trim()
    .min(1, { message: "Semester name is required." })
    .max(120, { message: "Semester name must be at most 120 characters." }),
});

export type UpdatePhaseInput = z.infer<typeof updatePhaseSchema>;

export function parseUpdatePhaseFormData(formData: FormData) {
  return safeParseFormData(updatePhaseSchema, {
    id: formData.get("id"),
    name: formData.get("name"),
  });
}
