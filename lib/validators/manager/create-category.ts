import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const createCategorySchema = z.object({
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

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export function parseCreateCategoryFormData(formData: FormData):
  | { success: true; data: CreateCategoryInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createCategorySchema.safeParse({
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
