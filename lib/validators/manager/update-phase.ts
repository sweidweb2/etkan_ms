import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { phaseFieldsSchema } from "@/lib/validators/manager/create-phase";

export const updatePhaseSchema = phaseFieldsSchema.extend({
  id: z.string().trim().uuid({ message: "Semester is required." }),
});

export type UpdatePhaseInput = z.infer<typeof updatePhaseSchema>;

export function parseUpdatePhaseFormData(formData: FormData) {
  return safeParseFormData(updatePhaseSchema, {
    id: formData.get("id"),
    name: formData.get("name"),
  });
}
