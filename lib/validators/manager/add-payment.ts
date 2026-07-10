import { z } from "zod";
import { PAYMENT_METHOD_VALUES } from "@/lib/constants/manager-payment-methods";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const addPaymentSchema = z.object({
  amount: z.coerce
    .number({ message: "Amount is required." })
    .positive({ message: "Amount must be greater than zero." }),
  currency: z
    .string()
    .trim()
    .min(1, { message: "Currency is required." })
    .max(8, { message: "Currency is too long." }),
  method: z.enum(PAYMENT_METHOD_VALUES, {
    message: "Payment method is required.",
  }),
  paid_at: z
    .string()
    .trim()
    .min(1, { message: "Paid date is required." }),
});

export type AddPaymentInput = z.infer<typeof addPaymentSchema>;

export const createPaymentSchema = addPaymentSchema.extend({
  subscribed_semester_id: z
    .string()
    .trim()
    .uuid({ message: "Subscription is required." }),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export function parseCreatePaymentFormData(formData: FormData):
  | { success: true; data: CreatePaymentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createPaymentSchema.safeParse({
    subscribed_semester_id: formData.get("subscribed_semester_id"),
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
