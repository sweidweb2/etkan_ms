import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const updateCategorySchema = z.object({
  id: z.string().uuid({ message: "Category not found." }),
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

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export function parseUpdateCategoryFormData(formData: FormData):
  | { success: true; data: UpdateCategoryInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateCategorySchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    parent_id: formData.get("parent_id") ?? "",
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
