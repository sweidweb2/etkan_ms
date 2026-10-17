import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { optionalGalleryImageFileSchema } from "@/lib/validators/manager/create-gallery-image";

export const updateGalleryImageSchema = z.object({
  id: z.string().uuid({ message: "Invalid gallery image id." }),
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required." })
    .max(200, { message: "Name must be at most 200 characters." }),
  file: optionalGalleryImageFileSchema,
});

export type UpdateGalleryImageInput = z.infer<typeof updateGalleryImageSchema>;

export function parseUpdateGalleryImageFormData(formData: FormData) {
  return safeParseFormData(updateGalleryImageSchema, {
    id: formData.get("id"),
    name: formData.get("name"),
    file: formData.get("file"),
  });
}
