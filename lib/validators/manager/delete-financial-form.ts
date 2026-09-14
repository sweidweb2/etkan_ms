import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const deleteFinancialFormSchema = z.object({
  id: z.string().trim().uuid({ message: "Form is required." }),
  student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." }),
});

export type DeleteFinancialFormInput = z.infer<typeof deleteFinancialFormSchema>;

export function parseDeleteFinancialFormFormData(formData: FormData) {
  return safeParseFormData(deleteFinancialFormSchema, {
    id: formData.get("id"),
    student_payment_phase_id: formData.get("student_payment_phase_id"),
  });
}
