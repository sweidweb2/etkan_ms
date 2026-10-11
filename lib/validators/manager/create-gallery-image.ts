import { z } from "zod";
import {
  GALLERY_IMAGE_ALLOWED_MIME_TYPES,
  GALLERY_IMAGE_MAX_BYTES,
} from "@/lib/constants/manager-gallery";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";

const IMAGE_MAX_MB = GALLERY_IMAGE_MAX_BYTES / (1024 * 1024);

const allowedImageMimeSet = new Set<string>(GALLERY_IMAGE_ALLOWED_MIME_TYPES);

export const galleryImageFileSchema = z
  .custom<File>((value) => typeof File !== "undefined" && value instanceof File, {
    message: "An image file is required.",
  })
  .superRefine((file, ctx) => {
    if (file.size <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Image file is empty.",
      });
    }
    if (file.size > GALLERY_IMAGE_MAX_BYTES) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Image must be at most ${IMAGE_MAX_MB} MB.`,
      });
    }
    const mime = file.type.trim();
    if (!mime || !allowedImageMimeSet.has(mime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Upload a JPEG, PNG, WebP, or GIF image.",
      });
    }
    if (!file.name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Image file name is required.",
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
