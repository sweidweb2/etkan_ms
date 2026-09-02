import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

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

export function parseImportFinancialAdjustmentFormData(formData: FormData):
  | { success: true; data: ImportFinancialAdjustmentInput }
  | { success: false; error: string; fieldErrors: FieldErrors } {
  const parsed = importFinancialAdjustmentSchema.safeParse({
    target_student_payment_phase_id: formData.get(
      "target_student_payment_phase_id"
    ),
    source_adjustment_id: formData.get("source_adjustment_id"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}
