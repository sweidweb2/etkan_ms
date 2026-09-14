import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { BORROW_EQUIPMENT_STATUSES } from "@/lib/constants/manager-borrow-equipment-status";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const updateBorrowRecordSchema = z.object({
  id: z.string().uuid({ message: "Invalid borrow record." }),
  quantity: z.coerce
    .number({ message: "Quantity is required." })
    .int({ message: "Quantity must be a whole number." })
    .min(1, { message: "Quantity must be at least 1." })
    .max(999, { message: "Quantity must be at most 999." }),
  status: z.enum([
    BORROW_EQUIPMENT_STATUSES.BORROWED,
    BORROW_EQUIPMENT_STATUSES.RETURNED,
  ]),
  returnedAt: z.string().optional(),
});

export type UpdateBorrowRecordInput = z.infer<typeof updateBorrowRecordSchema>;

export const toggleBorrowReturnedSchema = z.object({
  id: z.string().uuid({ message: "Invalid borrow record." }),
  isReturned: z.boolean(),
});

export type ToggleBorrowReturnedInput = z.infer<typeof toggleBorrowReturnedSchema>;

export function parseUpdateBorrowRecordFormData(formData: FormData) {
  return safeParseFormData(updateBorrowRecordSchema, {
    id: formData.get("id"),
    quantity: formData.get("quantity"),
    status: formData.get("status"),
    returnedAt: formData.get("returnedAt") || undefined,
  });
}

export function parseToggleBorrowReturnedFormData(formData: FormData):
  | { success: true; data: ToggleBorrowReturnedInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = toggleBorrowReturnedSchema.safeParse({
    id: formData.get("id"),
    isReturned: formData.get("isReturned") === "true",
  });

  if (!parsed.success) {
    return {
      success: false,
      error: "Invalid borrow record.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  return { success: true, data: parsed.data };
}

// Re-export for edit dialog form schema compatibility.
export const updateBorrowEquipmentSchema = updateBorrowRecordSchema.omit({ id: true });
export type UpdateBorrowEquipmentInput = z.infer<typeof updateBorrowEquipmentSchema>;
