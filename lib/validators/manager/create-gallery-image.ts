import { z } from "zod";
import { validateGalleryImageClientFile } from "@/lib/manager/gallery/validate-client-file";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

export const galleryImageFileSchema = z
  .custom<File>((value) => typeof File !== "undefined" && value instanceof File, {
    message: "An image file is required.",
  })
  .superRefine((file, ctx) => {
    const result = validateGalleryImageClientFile(file);
    if (!result.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.error,
      });
    }
  });

export const optionalGalleryImageFileSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (value instanceof File && (value.size === 0 || !value.name.trim())) {
    return undefined;
  }
  return value;
}, galleryImageFileSchema.optional());

export const createGalleryImageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Name is required." })
    .max(200, { message: "Name must be at most 200 characters." }),
  file: galleryImageFileSchema,
});

export type CreateGalleryImageInput = z.infer<typeof createGalleryImageSchema>;

export function parseCreateGalleryImageFormData(formData: FormData) {
  return safeParseFormData(createGalleryImageSchema, {
    name: formData.get("name"),
    file: formData.get("file"),
  });
}
