import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const removeStudentFromClassSchema = z.object({
  id: z.string().trim().uuid({ message: "Enrollment is required." }),
  class_id: z.string().trim().uuid({ message: "Class is required." }),
});

export type RemoveStudentFromClassInput = z.infer<
  typeof removeStudentFromClassSchema
>;

export function parseRemoveStudentFromClassFormData(formData: FormData) {
  return safeParseFormData(removeStudentFromClassSchema, {
    id: formData.get("id"),
    class_id: formData.get("class_id"),
  });
}
