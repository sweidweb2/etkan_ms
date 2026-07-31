import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const cancelPaymentPhaseSchema = z.object({
  payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Payment phase is required." }),
});

export type CancelPaymentPhaseInput = z.infer<typeof cancelPaymentPhaseSchema>;

export function parseCancelPaymentPhaseFormData(formData: FormData):
  | { success: true; data: CancelPaymentPhaseInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = cancelPaymentPhaseSchema.safeParse({
    payment_phase_id: formData.get("payment_phase_id"),
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
