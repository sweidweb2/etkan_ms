import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { createEquipmentSchema } from "@/lib/validators/manager/create-equipment";
import type { FieldErrors } from "@/types/auth";

export const updateEquipmentSchema = createEquipmentSchema.extend({
  id: z.string().uuid({ message: "Invalid equipment id." }),
});

export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;

export function parseUpdateEquipmentFormData(formData: FormData):
  | { success: true; data: UpdateEquipmentInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateEquipmentSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unit_price: formData.get("unit_price"),
  });

  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(flattened),
    };
  }

  return { success: true, data: parsed.data };
}
