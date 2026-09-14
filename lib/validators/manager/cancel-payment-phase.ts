import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const cancelPaymentPhaseSchema = z.object({
  payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Payment phase is required." }),
});

export type CancelPaymentPhaseInput = z.infer<typeof cancelPaymentPhaseSchema>;

export function parseCancelPaymentPhaseFormData(formData: FormData) {
  return safeParseFormData(cancelPaymentPhaseSchema, {
    payment_phase_id: formData.get("payment_phase_id"),
  });
}
