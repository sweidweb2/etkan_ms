import { z } from "zod";
import { safeParseFormData } from "@/lib/validators/safe-parse-form-data";
import {
  PUBLIC_PROJECT_CLASSIFICATION_VALUES,
  PUBLIC_PROJECT_FIELD_LIMITS,
  PUBLIC_PROJECT_IMAGE_ALLOWED_MIME_TYPES,
  PUBLIC_PROJECT_IMAGE_MAX_BYTES,
} from "@/lib/constants/manager-public-project";

const TITLE_MAX = PUBLIC_PROJECT_FIELD_LIMITS.title.max;
const BODY_MAX = PUBLIC_PROJECT_FIELD_LIMITS.body.max;
const CATEGORY_MAX = PUBLIC_PROJECT_FIELD_LIMITS.category.max;
const AUTHOR_MAX = PUBLIC_PROJECT_FIELD_LIMITS.author.max;
const HREF_MAX = PUBLIC_PROJECT_FIELD_LIMITS.href.max;
const IMAGE_MAX_MB = PUBLIC_PROJECT_IMAGE_MAX_BYTES / (1024 * 1024);

const HREF_MESSAGE =
  "Enter a URL (http:// or https://) or a path starting with /.";

const allowedImageMimeSet = new Set<string>(
  PUBLIC_PROJECT_IMAGE_ALLOWED_MIME_TYPES
);

function requiredText(label: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, { message: `${label} is required.` })
    .max(max, { message: `${label} must be at most ${max} characters.` });
}

function optionalTrimmedString(max: number, message: string) {
  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
  }, z.string().max(max, { message }).nullable());
}

function optionalHref() {
  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
  }, z
    .string()
    .max(HREF_MAX, {
      message: `Path must be at most ${HREF_MAX} characters.`,
    })
    .refine(
      (value) => value.startsWith("/") || /^https?:\/\/.+/i.test(value),
      { message: HREF_MESSAGE }
    )
    .nullable());
}

export const publicProjectImageFileSchema = z
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
    if (file.size > PUBLIC_PROJECT_IMAGE_MAX_BYTES) {
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

export const optionalPublicProjectImageFileSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (value instanceof File && (value.size === 0 || !value.name.trim())) {
    return undefined;
  }
  return value;
}, publicProjectImageFileSchema.optional());

export const publicProjectFieldsSchema = z.object({
  classification: z.enum(PUBLIC_PROJECT_CLASSIFICATION_VALUES, {
    message: "Select a classification: students, teachers, or etkan.",
  }),
  category: requiredText("Category", CATEGORY_MAX),
  title: requiredText("Title", TITLE_MAX),
  body: requiredText("Body", BODY_MAX),
  author: optionalTrimmedString(
    AUTHOR_MAX,
    `Author must be at most ${AUTHOR_MAX} characters.`
  ),
  href: optionalHref(),
});

export const createPublicProjectSchema = publicProjectFieldsSchema.extend({
  image: optionalPublicProjectImageFileSchema,
});

export type CreatePublicProjectInput = z.infer<typeof createPublicProjectSchema>;

export function parseCreatePublicProjectFormData(formData: FormData) {
  return safeParseFormData(createPublicProjectSchema, {
    classification: formData.get("classification"),
    category: formData.get("category"),
    title: formData.get("title"),
    body: formData.get("body"),
    author: formData.get("author"),
    image: formData.get("image"),
    href: formData.get("href"),
  });
}
