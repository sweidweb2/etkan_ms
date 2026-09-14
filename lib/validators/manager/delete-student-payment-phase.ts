import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const deleteStudentPaymentPhaseSchema = z.object({
  id: z.string().trim().uuid({ message: "Student payment phase is required." }),
});

export type DeleteStudentPaymentPhaseInput = z.infer<
  typeof deleteStudentPaymentPhaseSchema
>;

export function parseDeleteStudentPaymentPhaseFormData(formData: FormData) {
  return safeParseFormData(deleteStudentPaymentPhaseSchema, {
    id: formData.get("id"),
  });
}
