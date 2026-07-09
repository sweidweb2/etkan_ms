import { z } from "zod";
import { SCHEDULED_PAYMENT_STATUS_VALUES } from "@/lib/constants/manager-scheduled-payment-status";

const scheduledPaymentBaseSchema = z.object({
  payment_date: z
    .string()
    .trim()
    .min(1, { message: "Payment date is required." }),
  amount: z.union([
    z.literal(""),
    z.coerce
      .number()
      .positive({ message: "Amount must be greater than zero." }),
  ]),
  status: z.enum(SCHEDULED_PAYMENT_STATUS_VALUES, {
    message: "Status is required.",
  }),
  note: z
    .string()
    .trim()
    .max(500, { message: "Note must be 500 characters or fewer." })
    .optional()
    .or(z.literal("")),
});

export const createScheduledPaymentSchema = scheduledPaymentBaseSchema;

export const updateScheduledPaymentSchema = scheduledPaymentBaseSchema;

export type CreateScheduledPaymentInput = z.infer<
  typeof createScheduledPaymentSchema
>;

export type UpdateScheduledPaymentInput = z.infer<
  typeof updateScheduledPaymentSchema
>;

export function parseScheduledPaymentAmount(
  value: CreateScheduledPaymentInput["amount"]
) {
  if (value === "" || value === undefined || value === null) {
    return null;
  }

  return value;
}
