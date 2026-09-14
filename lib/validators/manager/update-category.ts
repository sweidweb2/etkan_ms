import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { categoryFieldsSchema } from "@/lib/validators/manager/create-category";

export const updateCategorySchema = categoryFieldsSchema.extend({
  id: z.string().uuid({ message: "Category not found." }),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export function parseUpdateCategoryFormData(formData: FormData) {
  return safeParseFormData(updateCategorySchema, {
    id: formData.get("id"),
    name: formData.get("name"),
    parent_id: formData.get("parent_id") ?? "",
  });
}
