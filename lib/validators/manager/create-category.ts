import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

/** Shared fields for create and update category. */
export const categoryFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Category name is required." })
    .max(120, { message: "Category name must be at most 120 characters." }),
  parent_id: z
    .string()
    .uuid({ message: "Invalid parent category." })
    .optional()
    .or(z.literal("")),
});

export const createCategorySchema = categoryFieldsSchema;

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export function parseCreateCategoryFormData(formData: FormData) {
  return safeParseFormData(createCategorySchema, {
    name: formData.get("name"),
    parent_id: formData.get("parent_id") ?? "",
  });
}
