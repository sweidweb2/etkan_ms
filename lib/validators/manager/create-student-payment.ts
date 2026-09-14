import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { PAYMENT_METHOD_VALUES } from "@/lib/manager/accounting/constants";

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
    .number({ message: "Amount is required." })
    .gt(0, { message: "Amount must be greater than 0." })
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

/** Client-side schema that also caps amount at the payment phase price. */
export function createStudentPaymentFormSchema(maxAmount: number) {
  return createStudentPaymentSchema.superRefine((data, ctx) => {
    if (data.amount > maxAmount) {
      ctx.addIssue({
        code: "custom",
        path: ["amount"],
        message:
          "Amount must be greater than 0 and at most the payment phase price.",
      });
    }
  });
}

export function parseCreateStudentPaymentFormData(formData: FormData) {
  return safeParseFormData(createStudentPaymentSchema, {
    student_payment_phase_id: formData.get("student_payment_phase_id"),
    payment_date: formData.get("payment_date"),
    amount: formData.get("amount"),
    payment_method: formData.get("payment_method"),
    received_by: formData.get("received_by"),
    received_by_management: parseManagementFlag(
      formData.get("received_by_management")
    ),
    notes: formData.get("notes") ?? "",
  });
}
