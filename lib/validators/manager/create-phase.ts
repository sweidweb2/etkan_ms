import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

/** Shared fields for create and update semester (phase). */
export const phaseFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Semester name is required." })
    .max(120, { message: "Semester name must be at most 120 characters." }),
});

export const createPhaseSchema = phaseFieldsSchema;

export type CreatePhaseInput = z.infer<typeof createPhaseSchema>;

export function parseCreatePhaseFormData(formData: FormData) {
  return safeParseFormData(createPhaseSchema, {
    name: formData.get("name"),
  });
}
