import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const createEquipmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Equipment name is required." })
    .max(120, { message: "Equipment name must be at most 120 characters." }),
  description: z
    .string()
    .trim()
    .max(500, { message: "Description must be at most 500 characters." })
    .optional()
    .or(z.literal("")),
  quantity: z.coerce
    .number()
    .int({ message: "Quantity must be a whole number." })
    .min(0, { message: "Quantity must be 0 or greater." })
    .max(100000, { message: "Quantity must be at most 100,000." }),
  unit_price: z.coerce
    .number()
    .min(0, { message: "Unit price must be 0 or greater." })
    .max(1000000, { message: "Unit price must be at most 1,000,000." }),
});

export type CreateEquipmentInput = z.infer<typeof createEquipmentSchema>;

export function parseCreateEquipmentFormData(formData: FormData) {
  return safeParseFormData(createEquipmentSchema, {
    name: formData.get("name"),
    description: formData.get("description"),
    quantity: formData.get("quantity"),
    unit_price: formData.get("unit_price"),
  });
}
