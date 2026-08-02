import { z } from "zod";
import {
  WORKSHOP_PAYMENT_METHOD_VALUES,
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
    .max(500, { message: "Notes must be at most 500 characters." })
    .nullable());
}

const sharedFields = {
  amount: z.coerce
    .number()
    .positive({ message: "Amount must be greater than zero." })
    .max(1_000_000, { message: "Amount must be at most 1,000,000." }),
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
