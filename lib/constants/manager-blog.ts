export const BLOG_STATUS_VALUES = ["draft", "published"] as const;

export type BlogStatusValue = (typeof BLOG_STATUS_VALUES)[number];

export const BLOG_STATUS_LABELS: Record<BlogStatusValue, string> = {
  draft: "Draft",
  published: "Published",
};

export const BLOG_FIELD_LIMITS = {
  slug: { min: 1, max: 120 },
  title: { min: 1, max: 200 },
  summary: { min: 1, max: 500 },
  body_html: { max: 200_000 },
  author_name: { min: 1, max: 120 },
  categories: { maxItems: 8, itemMin: 1, itemMax: 40 },
  sources: { maxItems: 20, itemMin: 1, itemMax: 500 },
  meta_title: { min: 2, max: 120 },
  meta_description: { min: 2, max: 300 },
  reading_time_minutes: { min: 1, max: 120 },
} as const;

export const BLOG_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Longest edge for cover/thumbnail WebP after server optimize. */
export const BLOG_IMAGE_THUMBNAIL_MAX_EDGE = 2048;

/** Square edge for author avatar WebP after server optimize. */
export const BLOG_IMAGE_AVATAR_MAX_EDGE = 512;

export const BLOG_IMAGE_WEBP_QUALITY = 82;

export const BLOG_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export type BlogImageMimeType = (typeof BLOG_IMAGE_ALLOWED_MIME_TYPES)[number];

export const BLOG_IMAGE_ACCEPT = BLOG_IMAGE_ALLOWED_MIME_TYPES.join(",");

export const PUBLIC_BLOGS_PAGE_SIZE = 9;
