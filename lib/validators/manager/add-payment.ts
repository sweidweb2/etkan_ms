import { z } from "zod";
import { PAYMENT_METHOD_VALUES } from "@/lib/constants/manager-payment-methods";

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
