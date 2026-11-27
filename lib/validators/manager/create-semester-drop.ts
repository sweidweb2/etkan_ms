import { z } from "zod";
import {
  SEMESTER_DROP_RESTRICTION_MODES,
  SEMESTER_DROP_RESTRICTION_MODE_VALUES,
  type SemesterDropRestrictionMode,
} from "@/lib/manager/accounting/constants";

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

const restrictionValueSchema = z.preprocess(
  emptyToUndefined,
  z.coerce.number().finite().optional()
);

export const createSemesterDropSchema = z
  .object({
    student_id: z.string().uuid("Invalid student."),
    class_id: z.string().uuid("Invalid class."),
    membership_id: z.string().uuid("Invalid membership.").optional(),
    restriction_mode: z
      .enum(SEMESTER_DROP_RESTRICTION_MODE_VALUES)
      .default(SEMESTER_DROP_RESTRICTION_MODES.PERCENT),
    required_percent: restrictionValueSchema,
    required_amount: restrictionValueSchema,
    require_immediate: z.coerce.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    const mode = data.restriction_mode;
    const percent = data.required_percent;
    const amount = data.required_amount;

    if (mode === SEMESTER_DROP_RESTRICTION_MODES.NONE) {
      return;
    }

    if (mode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT) {
      if (percent === undefined || percent === 0) {
        return;
      }
      if (percent < 0 || percent > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["required_percent"],
          message: "Percent must be between 0 and 100.",
        });
      }
      return;
    }

    if (mode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT) {
      if (amount === undefined || amount === 0) {
        return;
      }
      if (amount < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["required_amount"],
          message: "Amount must be at least 0.",
        });
      }
    }
  })
  .transform((data) => {
    let mode: SemesterDropRestrictionMode = data.restriction_mode;
    let requiredPercent = data.required_percent ?? null;
    let requiredAmount = data.required_amount ?? null;

    if (mode === SEMESTER_DROP_RESTRICTION_MODES.PERCENT) {
      if (requiredPercent === null || requiredPercent === 0) {
        mode = SEMESTER_DROP_RESTRICTION_MODES.NONE;
        requiredPercent = null;
        requiredAmount = null;
      } else {
        requiredAmount = null;
      }
    } else if (mode === SEMESTER_DROP_RESTRICTION_MODES.AMOUNT) {
      if (requiredAmount === null || requiredAmount === 0) {
        mode = SEMESTER_DROP_RESTRICTION_MODES.NONE;
        requiredPercent = null;
        requiredAmount = null;
      } else {
        requiredPercent = null;
      }
    } else {
      requiredPercent = null;
      requiredAmount = null;
    }

    return {
      student_id: data.student_id,
      class_id: data.class_id,
      membership_id: data.membership_id,
      restriction_mode: mode,
      required_percent: requiredPercent,
      required_amount: requiredAmount,
      require_immediate: data.require_immediate ?? false,
    };
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
