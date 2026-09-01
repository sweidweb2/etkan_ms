import { z } from "zod";
import { PAYMENT_SCHEDULE_STATUS_VALUES } from "@/lib/manager/accounting/constants";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const updateStudentPaymentScheduleSchema = z.object({
  id: z.string().trim().uuid({ message: "Schedule row is required." }),
  student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." }),
  due_date: z
    .string()
    .trim()
    .min(1, { message: "Due date is required." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Due date must be YYYY-MM-DD.",
    }),
  amount: z.coerce
    .number({ message: "Amount is required." })
    .gt(0, { message: "Amount must be greater than 0." })
    .max(1_000_000, { message: "Amount must be at most 1,000,000." }),
  label: z
    .string()
    .trim()
    .min(1, { message: "Label is required." })
    .max(80, { message: "Label must be at most 80 characters." }),
  status: z.enum(PAYMENT_SCHEDULE_STATUS_VALUES, {
    message: "Status is required.",
  }),
  notes: z
    .string()
    .trim()
    .max(500, { message: "Notes must be at most 500 characters." })
    .optional()
    .or(z.literal("")),
});

export type UpdateStudentPaymentScheduleInput = z.infer<
  typeof updateStudentPaymentScheduleSchema
>;

export function parseUpdateStudentPaymentScheduleFormData(formData: FormData):
  | { success: true; data: UpdateStudentPaymentScheduleInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateStudentPaymentScheduleSchema.safeParse({
    id: formData.get("id"),
    student_payment_phase_id: formData.get("student_payment_phase_id"),
    due_date: formData.get("due_date"),
    amount: formData.get("amount"),
    label: formData.get("label"),
    status: formData.get("status"),
    notes: formData.get("notes") ?? "",
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
