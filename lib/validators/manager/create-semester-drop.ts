import { z } from "zod";
import { SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT } from "@/lib/manager/accounting/constants";

export const createSemesterDropSchema = z.object({
  student_id: z.string().uuid("Invalid student."),
  class_id: z.string().uuid("Invalid class."),
  membership_id: z.string().uuid("Invalid membership.").optional(),
  required_percent: z.coerce
    .number()
    .gt(0, "Percent must be greater than 0.")
    .lte(100, "Percent must be at most 100.")
    .default(SEMESTER_DROP_DEFAULT_REQUIRED_PERCENT),
});

export type CreateSemesterDropInput = z.infer<typeof createSemesterDropSchema>;

export const cancelSemesterDropSchema = z.object({
  request_id: z.string().uuid("Invalid drop request."),
  class_id: z.string().uuid("Invalid class."),
});

export type CancelSemesterDropInput = z.infer<typeof cancelSemesterDropSchema>;

export const processDropRefundSchema = z.object({
  request_id: z.string().uuid("Invalid drop request."),
  amount: z.coerce.number().gt(0, "Amount must be greater than 0."),
  payment_date: z.string().min(1, "Payment date is required."),
  payment_method: z.string().min(1, "Payment method is required."),
  received_by: z.string().min(1, "Received by is required."),
  received_by_management: z.coerce.boolean().optional().default(false),
  notes: z.string().optional().nullable(),
});

export type ProcessDropRefundInput = z.infer<typeof processDropRefundSchema>;
