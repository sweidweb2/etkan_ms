import {
  PROJECT_SECTION_IDS,
  type ProjectSectionId,
} from "@/lib/constants/public-projects";

export const PUBLIC_PROJECT_FIELD_LIMITS = {
  title: { min: 1, max: 120 },
  body: { min: 1, max: 500 },
  category: { min: 1, max: 80 },
  image_url: { max: 2000 },
  href: { max: 2000 },
} as const;

export const PUBLIC_PROJECT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const PUBLIC_PROJECT_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type PublicProjectImageMimeType =
  (typeof PUBLIC_PROJECT_IMAGE_ALLOWED_MIME_TYPES)[number];

export const PUBLIC_PROJECT_IMAGE_ACCEPT =
  PUBLIC_PROJECT_IMAGE_ALLOWED_MIME_TYPES.join(",");

export const PUBLIC_PROJECT_CLASSIFICATION_VALUES = PROJECT_SECTION_IDS;

export type PublicProjectClassificationValue = ProjectSectionId;

export const PUBLIC_PROJECT_CLASSIFICATION_LABELS: Record<
  PublicProjectClassificationValue,
  string
> = {
  students: "Students",
  teachers: "Teachers",
  etkan: "Etkan",
};
