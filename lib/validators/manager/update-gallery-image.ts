import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import { createGalleryImageSchema } from "@/lib/validators/manager/create-gallery-image";

export const updateGalleryImageSchema = createGalleryImageSchema.extend({
  id: z.string().uuid({ message: "Invalid gallery image id." }),
});

export type UpdateGalleryImageInput = z.infer<typeof updateGalleryImageSchema>;

export function parseUpdateGalleryImageFormData(formData: FormData) {
  return safeParseFormData(updateGalleryImageSchema, {
    id: formData.get("id"),
    name: formData.get("name"),
    direct_url: formData.get("direct_url"),
  });
}
