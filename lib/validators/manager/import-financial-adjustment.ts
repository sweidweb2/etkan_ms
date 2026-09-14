import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const importFinancialAdjustmentSchema = z.object({
  target_student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." }),
  source_adjustment_id: z
    .string()
    .trim()
    .uuid({ message: "Source adjustment is required." }),
});

export type ImportFinancialAdjustmentInput = z.infer<
  typeof importFinancialAdjustmentSchema
>;

export function parseImportFinancialAdjustmentFormData(formData: FormData) {
  return safeParseFormData(importFinancialAdjustmentSchema, {
    target_student_payment_phase_id: formData.get(
      "target_student_payment_phase_id"
    ),
    source_adjustment_id: formData.get("source_adjustment_id"),
  });
}
