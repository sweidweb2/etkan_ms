import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createPaymentPhaseSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: "Phase name is required." })
      .max(120, { message: "Phase name must be at most 120 characters." }),
    class_id: z
      .string()
      .trim()
      .uuid({ message: "Class is required." }),
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

export type CreatePaymentPhaseInput = z.infer<typeof createPaymentPhaseSchema>;

export function parseCreatePaymentPhaseFormData(formData: FormData):
  | { success: true; data: CreatePaymentPhaseInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createPaymentPhaseSchema.safeParse({
    name: formData.get("name"),
    class_id: formData.get("class_id"),
    amount: formData.get("amount"),
    upfront_amount: formData.get("upfront_amount"),
    duration_months: formData.get("duration_months"),
    start_date: formData.get("start_date"),
    end_date: formData.get("end_date"),
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
