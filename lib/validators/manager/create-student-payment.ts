import { z } from "zod";
import { PAYMENT_METHOD_VALUES } from "@/lib/manager/accounting/constants";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

function parseManagementFlag(value: FormDataEntryValue | null): boolean {
  if (value === null || value === undefined || value === "") {
    return true;
  }
  const normalized = String(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "on";
}

export const createStudentPaymentSchema = z.object({
  student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." }),
  payment_date: z
    .string()
    .trim()
    .min(1, { message: "Payment date is required." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Payment date must be YYYY-MM-DD.",
    }),
  amount: z.coerce
    .number()
    .min(0, { message: "Amount must be 0 or greater." })
    .max(1_000_000, { message: "Amount must be at most 1,000,000." }),
  payment_method: z.enum(PAYMENT_METHOD_VALUES, {
    message: "Payment method is required.",
  }),
  received_by: z
    .string()
    .trim()
    .min(1, { message: "Received by is required." })
    .max(120, { message: "Received by must be at most 120 characters." }),
  received_by_management: z.boolean(),
  receipt_number: z
    .string()
    .trim()
    .max(80, { message: "Receipt number must be at most 80 characters." })
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(500, { message: "Notes must be at most 500 characters." })
    .optional()
    .or(z.literal("")),
});

export type CreateStudentPaymentInput = z.infer<
  typeof createStudentPaymentSchema
>;

export function parseCreateStudentPaymentFormData(formData: FormData):
  | { success: true; data: CreateStudentPaymentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createStudentPaymentSchema.safeParse({
    student_payment_phase_id: formData.get("student_payment_phase_id"),
    payment_date: formData.get("payment_date"),
    amount: formData.get("amount"),
    payment_method: formData.get("payment_method"),
    received_by: formData.get("received_by"),
    received_by_management: parseManagementFlag(
      formData.get("received_by_management")
    ),
    receipt_number: formData.get("receipt_number") ?? "",
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
