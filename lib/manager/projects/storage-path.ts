export const PROJECTS_STORAGE_BUCKET = "projects";

const MAX_SAFE_NAME_LENGTH = 120;

/**
 * Sanitize an upload filename for Storage object keys.
 * Strips path segments, keeps [a-zA-Z0-9._-], collapses runs of separators.
 */
export function sanitizeProjectImageFileName(originalFileName: string): string {
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
 * `projects/{uuid}-{safeName}`
 */
export function buildProjectImageStoragePath(
  originalFileName: string,
  objectId: string = crypto.randomUUID()
): string {
  const safeName = sanitizeProjectImageFileName(originalFileName);
  return `${PROJECTS_STORAGE_BUCKET}/${objectId}-${safeName}`;
}

export function splitProjectImageStoragePath(storagePath: string): {
  bucket: string;
  objectPath: string;
} {
  const prefix = `${PROJECTS_STORAGE_BUCKET}/`;
  if (!storagePath.startsWith(prefix)) {
    return { bucket: PROJECTS_STORAGE_BUCKET, objectPath: storagePath };
  }
  return {
    bucket: PROJECTS_STORAGE_BUCKET,
    objectPath: storagePath.slice(prefix.length),
  };
}

/**
 * Public URL for a project image.
 * `supabaseUrl` is the project URL (e.g. NEXT_PUBLIC_SUPABASE_URL).
 */
export function getProjectImagePublicUrl(
  supabaseUrl: string,
  storagePath: string
): string {
  const { bucket, objectPath } = splitProjectImageStoragePath(storagePath);
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
}

/**
 * Object key inside the `projects` bucket, if `imageUrl` is a public Storage URL
 * for that bucket. Returns null for pasted/external URLs.
 */
export function getProjectImageObjectPathFromPublicUrl(
  imageUrl: string
): string | null {
  try {
    const parsed = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${PROJECTS_STORAGE_BUCKET}/`;
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
