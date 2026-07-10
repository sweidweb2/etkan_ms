import { z } from "zod";
import { addPaymentSchema } from "@/lib/validators/manager/add-payment";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const updatePaymentSchema = addPaymentSchema.extend({
  id: z.string().trim().uuid({ message: "Payment is required." }),
});

export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;

export function parseUpdatePaymentFormData(formData: FormData):
  | { success: true; data: UpdatePaymentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updatePaymentSchema.safeParse({
    id: formData.get("id"),
    amount: formData.get("amount"),
    currency: formData.get("currency"),
    method: formData.get("method"),
    paid_at: formData.get("paid_at"),
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
