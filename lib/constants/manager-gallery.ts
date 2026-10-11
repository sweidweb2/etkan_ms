export const GALLERY_IMAGE_MAX_BYTES = 15 * 1024 * 1024;

export const GALLERY_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type GalleryImageMimeType =
  (typeof GALLERY_IMAGE_ALLOWED_MIME_TYPES)[number];

export const GALLERY_IMAGE_ALLOWED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
] as const;

/** MIME types + extensions for `<input accept>` / file pickers. */
export const GALLERY_IMAGE_ACCEPT = [
  ...GALLERY_IMAGE_ALLOWED_MIME_TYPES,
  ...GALLERY_IMAGE_ALLOWED_EXTENSIONS,
].join(",");

/** Longest edge after resize (px). */
export const GALLERY_IMAGE_MAX_EDGE = 2048;

export const GALLERY_IMAGE_WEBP_QUALITY = 82;
