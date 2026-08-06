import { z } from "zod";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import { createGalleryImageSchema } from "@/lib/validators/manager/create-gallery-image";
import type { FieldErrors } from "@/types/auth";

export const updateGalleryImageSchema = createGalleryImageSchema.extend({
  id: z.string().uuid({ message: "Invalid gallery image id." }),
});

export type UpdateGalleryImageInput = z.infer<typeof updateGalleryImageSchema>;

export function parseUpdateGalleryImageFormData(formData: FormData):
  | { success: true; data: UpdateGalleryImageInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = updateGalleryImageSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    direct_url: formData.get("direct_url"),
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
