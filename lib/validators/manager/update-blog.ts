import { z } from "zod";
import {
  createBlogSchema,
  optionalBlogImageFileSchema,
} from "@/lib/validators/manager/create-blog";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

export const updateBlogSchema = createBlogSchema.extend({
  id: z.string().uuid({ message: "Invalid blog id." }),
  thumbnail: optionalBlogImageFileSchema,
  author_avatar: optionalBlogImageFileSchema,
});

export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;

export function parseUpdateBlogFormData(formData: FormData):
  | { success: true; data: UpdateBlogInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateBlogSchema.safeParse({
    id: formData.get("id"),
    slug: formData.get("slug"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    body_html: formData.get("body_html") ?? "",
    categories: formData.get("categories"),
    sources: formData.get("sources"),
    author_name: formData.get("author_name"),
    status: formData.get("status"),
    is_featured: formData.get("is_featured"),
    meta_title: formData.get("meta_title"),
    meta_description: formData.get("meta_description"),
    thumbnail: formData.get("thumbnail"),
    author_avatar: formData.get("author_avatar"),
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
