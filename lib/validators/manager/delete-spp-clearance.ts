import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const deleteSppClearanceSchema = z.object({
  id: z.string().trim().uuid({ message: "Clearance is required." }),
  student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." }),
});

export type DeleteSppClearanceInput = z.infer<typeof deleteSppClearanceSchema>;

export function parseDeleteSppClearanceFormData(formData: FormData) {
  return safeParseFormData(deleteSppClearanceSchema, {
    id: formData.get("id"),
    student_payment_phase_id: formData.get("student_payment_phase_id"),
  });
}
