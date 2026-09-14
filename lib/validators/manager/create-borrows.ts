import { z } from "zod";
import { formValidationFailure } from "@/lib/validators/safe-parse-form-data";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

const borrowItemSchema = z.object({
  user_id: z.string().uuid({ message: "Invalid student." }),
  equipment_id: z.string().uuid({ message: "Invalid equipment." }),
  quantity: z.coerce
    .number()
    .int({ message: "Quantity must be a whole number." })
    .min(1, { message: "Quantity must be at least 1." })
    .max(999, { message: "Quantity must be at most 999." }),
});

export const createBorrowsSchema = z.object({
  items: z
    .array(borrowItemSchema)
    .min(1, { message: "Select at least one student and equipment item." }),
});

export type CreateBorrowsInput = z.infer<typeof createBorrowsSchema>;

export function parseCreateBorrowsFormData(formData: FormData):
  | { success: true; data: CreateBorrowsInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const rawItems = formData.get("items");

  if (typeof rawItems !== "string" || !rawItems.trim()) {
    return { success: false, error: "Invalid borrow data." };
  }

  let parsedItems: unknown;

  try {
    parsedItems = JSON.parse(rawItems);
  } catch {
    return { success: false, error: "Invalid borrow data." };
  }

  const parsed = createBorrowsSchema.safeParse({ items: parsedItems });

  if (!parsed.success) {
    return formValidationFailure(zodFieldErrors(parsed.error.flatten().fieldErrors));
  }

  return { success: true, data: parsed.data };
}
