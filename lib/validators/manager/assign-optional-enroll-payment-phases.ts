import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const assignOptionalEnrollPaymentPhasesSchema = z.object({
  student_id: z
    .string()
    .trim()
    .uuid({ message: "Student is required." }),
  payment_phase_ids: z
    .array(z.string().trim().uuid({ message: "Payment phase is required." }))
    .min(1, { message: "Select at least one payment phase." }),
});

export type AssignOptionalEnrollPaymentPhasesInput = z.infer<
  typeof assignOptionalEnrollPaymentPhasesSchema
>;

export function parseAssignOptionalEnrollPaymentPhasesFormData(
  formData: FormData
):
  | { success: true; data: AssignOptionalEnrollPaymentPhasesInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const payment_phase_ids = formData
    .getAll("payment_phase_ids")
    .filter((value): value is string => typeof value === "string");

  const parsed = assignOptionalEnrollPaymentPhasesSchema.safeParse({
    student_id: formData.get("student_id"),
    payment_phase_ids,
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
