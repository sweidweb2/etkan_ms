import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  optionalPublicProjectImageFileSchema,
  publicProjectFieldsSchema,
} from "@/lib/validators/manager/create-public-project";
import type { FieldErrors } from "@/types/auth";

export const updatePublicProjectSchema = publicProjectFieldsSchema.extend({
  id: z.string().uuid({ message: "Invalid project id." }),
  image: optionalPublicProjectImageFileSchema,
});

export type UpdatePublicProjectInput = z.infer<typeof updatePublicProjectSchema>;

export function parseUpdatePublicProjectFormData(formData: FormData):
  | { success: true; data: UpdatePublicProjectInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updatePublicProjectSchema.safeParse({
    id: formData.get("id"),
    classification: formData.get("classification"),
    category: formData.get("category"),
    title: formData.get("title"),
    body: formData.get("body"),
    author: formData.get("author"),
    image: formData.get("image"),
    href: formData.get("href"),
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
