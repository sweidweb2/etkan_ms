import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  optionalPublicProjectImageFileSchema,
  publicProjectFieldsSchema,
} from "@/lib/validators/manager/create-public-project";

export const updatePublicProjectSchema = publicProjectFieldsSchema.extend({
  id: z.string().uuid({ message: "Invalid project id." }),
  image: optionalPublicProjectImageFileSchema,
});

export type UpdatePublicProjectInput = z.infer<typeof updatePublicProjectSchema>;

export function parseUpdatePublicProjectFormData(formData: FormData) {
  return safeParseFormData(updatePublicProjectSchema, {
    id: formData.get("id"),
    classification: formData.get("classification"),
    category: formData.get("category"),
    title: formData.get("title"),
    body: formData.get("body"),
    author: formData.get("author"),
    image: formData.get("image"),
    href: formData.get("href"),
  });
}
