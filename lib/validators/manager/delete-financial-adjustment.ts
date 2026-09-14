import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const deleteFinancialAdjustmentSchema = z.object({
  id: z.string().trim().uuid({ message: "Adjustment is required." }),
  student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." })
    .optional()
    .or(z.literal("")),
});

export type DeleteFinancialAdjustmentInput = z.infer<
  typeof deleteFinancialAdjustmentSchema
>;

export function parseDeleteFinancialAdjustmentFormData(formData: FormData) {
  return safeParseFormData(deleteFinancialAdjustmentSchema, {
    id: formData.get("id"),
    student_payment_phase_id: formData.get("student_payment_phase_id") ?? "",
  });
}
