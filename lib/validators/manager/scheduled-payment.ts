import { z } from "zod";
import {
  SCHEDULED_PAYMENT_STATUSES,
  SCHEDULED_PAYMENT_STATUS_VALUES,
} from "@/lib/constants/manager-scheduled-payment-status";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

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

export const createScheduledPaymentSchema = scheduledPaymentBaseSchema.extend({
  subscribed_semester_id: z
    .string()
    .trim()
    .uuid({ message: "Subscription is required." }),
});

export const updateScheduledPaymentSchema = scheduledPaymentBaseSchema.extend({
  id: z.string().trim().uuid({ message: "Scheduled payment is required." }),
});

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

export function parseCreateScheduledPaymentFormData(formData: FormData):
  | { success: true; data: CreateScheduledPaymentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createScheduledPaymentSchema.safeParse({
    subscribed_semester_id: formData.get("subscribed_semester_id"),
    payment_date: formData.get("payment_date"),
    amount: formData.get("amount"),
    status: SCHEDULED_PAYMENT_STATUSES.SCHEDULED,
    note: formData.get("note"),
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

export function parseUpdateScheduledPaymentFormData(formData: FormData):
  | { success: true; data: UpdateScheduledPaymentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateScheduledPaymentSchema.safeParse({
    id: formData.get("id"),
    payment_date: formData.get("payment_date"),
    amount: formData.get("amount"),
    status: formData.get("status"),
    note: formData.get("note"),
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
