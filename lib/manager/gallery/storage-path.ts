export const GALLERY_STORAGE_BUCKET = "gallery";

const MAX_SAFE_NAME_LENGTH = 120;

/**
 * Sanitize an upload filename for Storage object keys.
 * Strips path segments, keeps [a-zA-Z0-9._-], collapses runs of separators.
 */
export function sanitizeGalleryImageFileName(originalFileName: string): string {
  const base = originalFileName.replace(/\\/g, "/").split("/").pop() ?? "";
  const withoutControl = base.replace(/[\u0000-\u001f\u007f]/g, "");
  const replaced = withoutControl
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/-\./g, ".")
    .replace(/^\.+/, "")
    .replace(/^[.-]+|[.-]+$/g, "");

  const fallback = replaced.length > 0 ? replaced : "image";
  return fallback.slice(0, MAX_SAFE_NAME_LENGTH);
}

/**
 * Logical path stored for Storage APIs:
 * `gallery/{uuid}-{safeName}`
 */
export function buildGalleryImageStoragePath(
  originalFileName: string,
  objectId: string = crypto.randomUUID()
): string {
  const safeName = sanitizeGalleryImageFileName(originalFileName);
  return `${GALLERY_STORAGE_BUCKET}/${objectId}-${safeName}`;
}

export function splitGalleryImageStoragePath(storagePath: string): {
  bucket: string;
  objectPath: string;
} {
  const prefix = `${GALLERY_STORAGE_BUCKET}/`;
  if (!storagePath.startsWith(prefix)) {
    return { bucket: GALLERY_STORAGE_BUCKET, objectPath: storagePath };
  }
  return {
    bucket: GALLERY_STORAGE_BUCKET,
    objectPath: storagePath.slice(prefix.length),
  };
}

/**
 * Public URL for a gallery image.
 * `supabaseUrl` is the project URL (e.g. NEXT_PUBLIC_SUPABASE_URL).
 */
export function getGalleryImagePublicUrl(
  supabaseUrl: string,
  storagePath: string
): string {
  const { bucket, objectPath } = splitGalleryImageStoragePath(storagePath);
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
}
