import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  createBlogSchema,
  optionalBlogImageFileSchema,
} from "@/lib/validators/manager/create-blog";

export const updateBlogSchema = createBlogSchema.extend({
  id: z.string().uuid({ message: "Invalid blog id." }),
  thumbnail: optionalBlogImageFileSchema,
  author_avatar: optionalBlogImageFileSchema,
});

export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;

export function parseUpdateBlogFormData(formData: FormData) {
  return safeParseFormData(updateBlogSchema, {
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
}
