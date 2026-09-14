export const BLOGS_STORAGE_BUCKET = "blogs";
export const AUTHOR_STORAGE_BUCKET = "auther";

const MAX_SAFE_NAME_LENGTH = 120;

/**
 * Sanitize an upload filename for Storage object keys.
 * Strips path segments, keeps [a-zA-Z0-9._-], collapses runs of separators.
 */
export function sanitizeBlogImageFileName(originalFileName: string): string {
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
 * `{bucket}/{uuid}-{safeName}`
 */
export function buildBlogImageStoragePath(
  bucket: typeof BLOGS_STORAGE_BUCKET | typeof AUTHOR_STORAGE_BUCKET,
  originalFileName: string,
  objectId: string = crypto.randomUUID()
): string {
  const safeName = sanitizeBlogImageFileName(originalFileName);
  return `${bucket}/${objectId}-${safeName}`;
}

export function splitBlogImageStoragePath(
  storagePath: string,
  bucket: typeof BLOGS_STORAGE_BUCKET | typeof AUTHOR_STORAGE_BUCKET
): {
  bucket: string;
  objectPath: string;
} {
  const prefix = `${bucket}/`;
  if (!storagePath.startsWith(prefix)) {
    return { bucket, objectPath: storagePath };
  }
  return {
    bucket,
    objectPath: storagePath.slice(prefix.length),
  };
}

export function getBlogImagePublicUrl(
  supabaseUrl: string,
  storagePath: string,
  bucket: typeof BLOGS_STORAGE_BUCKET | typeof AUTHOR_STORAGE_BUCKET
): string {
  const { objectPath } = splitBlogImageStoragePath(storagePath, bucket);
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
}

/**
 * Object key inside the given bucket, if `imageUrl` is a public Storage URL
 * for that bucket. Returns null for pasted/external URLs.
 */
export function getBlogImageObjectPathFromPublicUrl(
  imageUrl: string,
  bucket: typeof BLOGS_STORAGE_BUCKET | typeof AUTHOR_STORAGE_BUCKET
): string | null {
  try {
    const parsed = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) {
      return null;
    }
    const objectPath = decodeURIComponent(
      parsed.pathname.slice(index + marker.length)
    );
    return objectPath.length > 0 ? objectPath : null;
  } catch {
    return null;
  }
}
