import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const createGalleryImageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required." })
    .max(200, { message: "Name must be at most 200 characters." }),
  direct_url: z
    .string()
    .trim()
    .min(1, { message: "Direct URL is required." })
    .url({ message: "Enter a valid URL." })
    .max(2000, { message: "Direct URL must be at most 2000 characters." }),
});

export type CreateGalleryImageInput = z.infer<typeof createGalleryImageSchema>;

export function parseCreateGalleryImageFormData(formData: FormData) {
  return safeParseFormData(createGalleryImageSchema, {
    name: formData.get("name"),
    direct_url: formData.get("direct_url"),
  });
}
