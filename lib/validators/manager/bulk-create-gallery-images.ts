import { z } from "zod";
import {
  createGalleryImageSchema,
  type CreateGalleryImageInput,
} from "@/lib/validators/manager/create-gallery-image";

export const BULK_GALLERY_IMAGES_LIMIT = 200;

export const bulkCreateGalleryImagesSchema = z
  .array(createGalleryImageSchema)
  .min(1, { message: "Provide at least one record." })
  .max(BULK_GALLERY_IMAGES_LIMIT, {
    message: `Maximum ${BULK_GALLERY_IMAGES_LIMIT} records per import.`,
  });

export type BulkCreateGalleryImagesInput = z.infer<
  typeof bulkCreateGalleryImagesSchema
>;

type ParseResult =
  | { success: true; data: CreateGalleryImageInput[] }
  | { success: false; error: string };

function formatIssues(error: z.ZodError): string {
  const issue = error.issues[0];

  if (!issue) {
    return "Invalid gallery records.";
  }

  const [index] = issue.path;

  if (typeof index === "number") {
    return `Record ${index + 1}: ${issue.message}`;
  }

  return issue.message;
}

export function parseBulkGalleryImages(value: unknown): ParseResult {
  const records =
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "images" in value
      ? (value as { images: unknown }).images
      : value;

  if (!Array.isArray(records)) {
    return {
      success: false,
      error:
        'Provide a JSON array of records, or an object with an "images" array.',
    };
  }

  const parsed = bulkCreateGalleryImagesSchema.safeParse(records);

  if (!parsed.success) {
    return { success: false, error: formatIssues(parsed.error) };
  }

  return { success: true, data: parsed.data };
}

export function parseBulkGalleryImagesJson(raw: string): ParseResult {
  const trimmed = raw.trim();

  if (!trimmed) {
    return { success: false, error: "Paste the JSON records first." };
  }

  let value: unknown;

  try {
    value = JSON.parse(trimmed);
  } catch {
    return {
      success: false,
      error: "Invalid JSON. Check the syntax and try again.",
    };
  }

  return parseBulkGalleryImages(value);
}
