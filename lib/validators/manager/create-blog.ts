import { z } from "zod";
import {
  BLOG_FIELD_LIMITS,
  BLOG_IMAGE_ALLOWED_MIME_TYPES,
  BLOG_IMAGE_MAX_BYTES,
  BLOG_STATUS_VALUES,
} from "@/lib/constants/manager-blog";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { FieldErrors } from "@/types/auth";

const IMAGE_MAX_MB = BLOG_IMAGE_MAX_BYTES / (1024 * 1024);
const allowedImageMimeSet = new Set<string>(BLOG_IMAGE_ALLOWED_MIME_TYPES);

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requiredText(label: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, { message: `${label} is required.` })
    .max(max, { message: `${label} must be at most ${max} characters.` });
}

function optionalSeoText(label: string, min: number, max: number) {
  return z.preprocess((value) => {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = String(value).trim();
    return trimmed === "" ? null : trimmed;
  }, z
    .string()
    .min(min, { message: `${label} must be at least ${min} characters.` })
    .max(max, { message: `${label} must be at most ${max} characters.` })
    .nullable());
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value !== "string") {
    return [];
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {
    // fall through to comma / newline split
  }
  return trimmed
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const categoriesSchema = z.preprocess(
  parseStringList,
  z
    .array(
      z
        .string()
        .trim()
        .min(BLOG_FIELD_LIMITS.categories.itemMin, {
          message: "Each category must be at least 1 character.",
        })
        .max(BLOG_FIELD_LIMITS.categories.itemMax, {
          message: `Each category must be at most ${BLOG_FIELD_LIMITS.categories.itemMax} characters.`,
        })
    )
    .max(BLOG_FIELD_LIMITS.categories.maxItems, {
      message: `At most ${BLOG_FIELD_LIMITS.categories.maxItems} categories.`,
    })
);

const sourcesSchema = z.preprocess(
  parseStringList,
  z
    .array(
      z
        .string()
        .trim()
        .min(BLOG_FIELD_LIMITS.sources.itemMin, {
          message: "Each source must be at least 1 character.",
        })
        .max(BLOG_FIELD_LIMITS.sources.itemMax, {
          message: `Each source must be at most ${BLOG_FIELD_LIMITS.sources.itemMax} characters.`,
        })
    )
    .max(BLOG_FIELD_LIMITS.sources.maxItems, {
      message: `At most ${BLOG_FIELD_LIMITS.sources.maxItems} sources.`,
    })
);

export const blogImageFileSchema = z
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
    if (file.size > BLOG_IMAGE_MAX_BYTES) {
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

export const optionalBlogImageFileSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  if (value instanceof File && (value.size === 0 || !value.name.trim())) {
    return undefined;
  }
  return value;
}, blogImageFileSchema.optional());

function booleanFromForm(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "on";
  }
  return false;
}

export const blogFieldsSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(BLOG_FIELD_LIMITS.slug.min, { message: "Slug is required." })
    .max(BLOG_FIELD_LIMITS.slug.max, {
      message: `Slug must be at most ${BLOG_FIELD_LIMITS.slug.max} characters.`,
    })
    .regex(SLUG_REGEX, {
      message:
        "Slug must be lowercase letters, numbers, and hyphens only (no leading/trailing hyphen).",
    }),
  title: requiredText("Title", BLOG_FIELD_LIMITS.title.max),
  summary: requiredText("Summary", BLOG_FIELD_LIMITS.summary.max),
  body_html: z
    .string()
    .max(BLOG_FIELD_LIMITS.body_html.max, {
      message: `Body must be at most ${BLOG_FIELD_LIMITS.body_html.max} characters.`,
    })
    .default(""),
  categories: categoriesSchema,
  sources: sourcesSchema,
  author_name: requiredText("Author name", BLOG_FIELD_LIMITS.author_name.max),
  status: z.enum(BLOG_STATUS_VALUES, {
    message: "Select draft or published.",
  }),
  is_featured: z.preprocess(booleanFromForm, z.boolean()),
  meta_title: optionalSeoText(
    "Meta title",
    BLOG_FIELD_LIMITS.meta_title.min,
    BLOG_FIELD_LIMITS.meta_title.max
  ),
  meta_description: optionalSeoText(
    "Meta description",
    BLOG_FIELD_LIMITS.meta_description.min,
    BLOG_FIELD_LIMITS.meta_description.max
  ),
});

export const createBlogSchema = blogFieldsSchema.extend({
  thumbnail: optionalBlogImageFileSchema,
  author_avatar: optionalBlogImageFileSchema,
});

export type CreateBlogInput = z.infer<typeof createBlogSchema>;

export function parseCreateBlogFormData(formData: FormData):
  | { success: true; data: CreateBlogInput }
  | { success: false; error: string; fieldErrors?: FieldErrors } {
  const parsed = createBlogSchema.safeParse({
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
