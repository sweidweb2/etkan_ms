import { z } from "zod";
import { WORKSHOP_FIELD_LIMITS } from "@/lib/constants/workshop-field-limits";
import {
  WORKSHOP_PAYMENT_METHOD_VALUES,
  WORKSHOP_PAYMENT_TYPES,
  WORKSHOP_PAYMENT_TYPE_VALUES,
} from "@/lib/constants/manager-workshop-display";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

function optionalPaymentMethod() {
  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    if (trimmed === "" || trimmed === "__none__") {
      return null;
    }
    return trimmed;
  }, z
    .enum(WORKSHOP_PAYMENT_METHOD_VALUES)
    .nullable());
}

function optionalNotes() {
  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
  }, z
    .string()
    .max(WORKSHOP_FIELD_LIMITS.payment_notes.max, {
      message: `Notes must be at most ${WORKSHOP_FIELD_LIMITS.payment_notes.max} characters.`,
    })
    .nullable());
}

const sharedFields = {
  amount: z.coerce
    .number()
    .positive({ message: "Amount must be greater than zero." })
    .max(WORKSHOP_FIELD_LIMITS.payment_amount.max, {
      message: `Amount must be at most ${WORKSHOP_FIELD_LIMITS.payment_amount.max.toLocaleString()}.`,
    }),
  type: z.enum(WORKSHOP_PAYMENT_TYPE_VALUES, {
    message: "Select credit or debit.",
  }),
  payment_date: z
    .string()
    .trim()
    .min(1, { message: "Payment date is required." })
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: "Payment date must be YYYY-MM-DD.",
    }),
  payment_method: optionalPaymentMethod(),
  notes: optionalNotes(),
};

export const createWorkshopPaymentSchema = z.object({
  workshop_id: z.string().uuid({ message: "Workshop is required." }),
  ...sharedFields,
});

export type CreateWorkshopPaymentInput = z.infer<
  typeof createWorkshopPaymentSchema
>;

export const updateWorkshopPaymentSchema = z.object({
  id: z.string().uuid({ message: "Payment is required." }),
  workshop_id: z.string().uuid({ message: "Workshop is required." }),
  ...sharedFields,
});

export type UpdateWorkshopPaymentInput = z.infer<
  typeof updateWorkshopPaymentSchema
>;

export const deleteWorkshopPaymentSchema = z.object({
  id: z.string().uuid({ message: "Payment is required." }),
  workshop_id: z.string().uuid({ message: "Workshop is required." }),
});

export type DeleteWorkshopPaymentInput = z.infer<
  typeof deleteWorkshopPaymentSchema
>;

export const WORKSHOP_PAYMENT_REMAINING_AMOUNT_MESSAGE =
  "Amount cannot exceed the remaining balance for this workshop.";

export const WORKSHOP_PAYMENT_FULLY_PAID_MESSAGE =
  "This workshop is already paid. No more payments can be recorded.";

/**
 * Remaining workshop balance: price − paid net. `null` when the workshop has no price
 * (no remaining cap). Clamped at 0 so overpaid workshops reject further credits.
 */
export function getWorkshopPaymentRemainingCap(
  price: number | null | undefined,
  paidNet: number
): number | null {
  if (price == null) {
    return null;
  }
  return Math.max(0, Number(price) - Number(paidNet));
}

/** True when the workshop has a price and paid net covers it. */
export function isWorkshopFullyPaid(
  price: number | null | undefined,
  paidNet: number
): boolean {
  if (price == null || Number(price) <= 0) {
    return false;
  }
  return Number(paidNet) >= Number(price);
}

function refineCreditWithinRemaining(
  data: { amount: number; type: string },
  maxAmount: number | null,
  ctx: z.RefinementCtx
) {
  if (maxAmount == null) {
    return;
  }
  if (data.type !== WORKSHOP_PAYMENT_TYPES.CREDIT) {
    return;
  }
  if (data.amount > maxAmount) {
    ctx.addIssue({
      code: "custom",
      path: ["amount"],
      message: WORKSHOP_PAYMENT_REMAINING_AMOUNT_MESSAGE,
    });
  }
}

/**
 * Client-side create schema that caps credit amounts at the remaining workshop balance.
 * Pass `null` when the workshop has no price (no remaining cap).
 */
export function createWorkshopPaymentFormSchema(maxAmount: number | null) {
  return createWorkshopPaymentSchema.superRefine((data, ctx) => {
    refineCreditWithinRemaining(data, maxAmount, ctx);
  });
}

/**
 * Client-side update schema that caps credit amounts at remaining + this payment's
 * current credit contribution (so editing the same credit can keep its amount).
 */
export function updateWorkshopPaymentFormSchema(maxAmount: number | null) {
  return updateWorkshopPaymentSchema.superRefine((data, ctx) => {
    refineCreditWithinRemaining(data, maxAmount, ctx);
  });
}

export function parseCreateWorkshopPaymentFormData(formData: FormData):
  | { success: true; data: CreateWorkshopPaymentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createWorkshopPaymentSchema.safeParse({
    workshop_id: formData.get("workshop_id"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    payment_date: formData.get("payment_date"),
    payment_method: formData.get("payment_method"),
    notes: formData.get("notes"),
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

export function parseUpdateWorkshopPaymentFormData(formData: FormData):
  | { success: true; data: UpdateWorkshopPaymentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateWorkshopPaymentSchema.safeParse({
    id: formData.get("id"),
    workshop_id: formData.get("workshop_id"),
    amount: formData.get("amount"),
    type: formData.get("type"),
    payment_date: formData.get("payment_date"),
    payment_method: formData.get("payment_method"),
    notes: formData.get("notes"),
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

export function parseDeleteWorkshopPaymentFormData(formData: FormData):
  | { success: true; data: DeleteWorkshopPaymentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = deleteWorkshopPaymentSchema.safeParse({
    id: formData.get("id"),
    workshop_id: formData.get("workshop_id"),
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
