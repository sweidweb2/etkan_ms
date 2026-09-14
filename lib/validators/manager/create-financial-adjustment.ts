import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  FINANCIAL_ADJUSTMENT_TYPE_VALUES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES,
} from "@/lib/manager/accounting/constants";

const adjustmentFields = {
  student_payment_phase_id: z
    .string()
    .trim()
    .uuid({ message: "Student payment phase is required." }),
  type: z.enum(FINANCIAL_ADJUSTMENT_TYPE_VALUES, {
    message: "Adjustment type is required.",
  }),
  value_type: z.enum(FINANCIAL_ADJUSTMENT_VALUE_TYPE_VALUES, {
    message: "Value type is required.",
  }),
  value: z.coerce
    .number()
    .min(0, { message: "Value must be 0 or greater." })
    .max(1_000_000, { message: "Value must be at most 1,000,000." }),
  reason: z
    .string()
    .trim()
    .max(500, { message: "Reason must be at most 500 characters." })
    .optional()
    .or(z.literal("")),
  effective_date: z
    .string()
    .trim()
    .min(1, { message: "Effective date is required." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Effective date must be YYYY-MM-DD.",
    }),
};

function withValueTypeRefine<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const record = data as {
      value_type: string;
      value: number;
    };
    if (
      record.value_type === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE &&
      record.value > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Percentage must be at most 100.",
        path: ["value"],
      });
    }
  });
}

export const createFinancialAdjustmentSchema = withValueTypeRefine(
  z.object(adjustmentFields)
);

export type CreateFinancialAdjustmentInput = z.infer<
  typeof createFinancialAdjustmentSchema
>;

export const updateFinancialAdjustmentSchema = withValueTypeRefine(
  z.object({
    id: z.string().trim().uuid({ message: "Adjustment is required." }),
    ...adjustmentFields,
  })
);

export type UpdateFinancialAdjustmentInput = z.infer<
  typeof updateFinancialAdjustmentSchema
>;

export function parseCreateFinancialAdjustmentFormData(formData: FormData) {
  return safeParseFormData(createFinancialAdjustmentSchema, {
    student_payment_phase_id: formData.get("student_payment_phase_id"),
    type: formData.get("type"),
    value_type: formData.get("value_type"),
    value: formData.get("value"),
    reason: formData.get("reason") ?? "",
    effective_date: formData.get("effective_date"),
  });
}

export function parseUpdateFinancialAdjustmentFormData(formData: FormData) {
  return safeParseFormData(updateFinancialAdjustmentSchema, {
    id: formData.get("id"),
    student_payment_phase_id: formData.get("student_payment_phase_id"),
    type: formData.get("type"),
    value_type: formData.get("value_type"),
    value: formData.get("value"),
    reason: formData.get("reason") ?? "",
    effective_date: formData.get("effective_date"),
  });
}
