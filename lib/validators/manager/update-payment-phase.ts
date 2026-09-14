import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const updatePaymentPhaseSchema = z
  .object({
    id: z
      .string()
      .trim()
      .uuid({ message: "Payment phase is required." }),
    name: z
      .string()
      .trim()
      .min(1, { message: "Phase name is required." })
      .max(120, { message: "Phase name must be at most 120 characters." }),
    amount: z.coerce
      .number()
      .min(0, { message: "Amount must be 0 or greater." })
      .max(1_000_000, { message: "Amount must be at most 1,000,000." }),
    upfront_amount: z.coerce
      .number()
      .min(0, { message: "Upfront amount must be 0 or greater." })
      .max(1_000_000, {
        message: "Upfront amount must be at most 1,000,000.",
      }),
    duration_months: z.coerce
      .number()
      .int({ message: "Duration must be a whole number." })
      .min(1, { message: "Duration must be at least 1 month." })
      .max(120, { message: "Duration must be at most 120 months." }),
    start_date: z
      .string()
      .trim()
      .min(1, { message: "Start date is required." })
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "Start date must be YYYY-MM-DD.",
      }),
    end_date: z
      .string()
      .trim()
      .min(1, { message: "End date is required." })
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: "End date must be YYYY-MM-DD.",
      }),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: "End date must be on or after start date.",
    path: ["end_date"],
  })
  .refine((data) => data.upfront_amount <= data.amount, {
    message: "Upfront amount cannot exceed total amount.",
    path: ["upfront_amount"],
  });

export type UpdatePaymentPhaseInput = z.infer<typeof updatePaymentPhaseSchema>;

export function parseUpdatePaymentPhaseFormData(formData: FormData) {
  return safeParseFormData(updatePaymentPhaseSchema, {
    id: formData.get("id"),
    name: formData.get("name"),
    amount: formData.get("amount"),
    upfront_amount: formData.get("upfront_amount"),
    duration_months: formData.get("duration_months"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
  });
}
