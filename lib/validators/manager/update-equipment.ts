import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { createEquipmentSchema } from "@/lib/validators/manager/create-equipment";

export const updateEquipmentSchema = createEquipmentSchema.extend({
  id: z.string().uuid({ message: "Invalid equipment id." }),
});

export type UpdateEquipmentInput = z.infer<typeof updateEquipmentSchema>;

export function parseUpdateEquipmentFormData(formData: FormData) {
  return safeParseFormData(updateEquipmentSchema, {
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unit_price: formData.get("unit_price"),
  });
}
