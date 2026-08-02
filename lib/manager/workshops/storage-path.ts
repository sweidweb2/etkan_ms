export const WORKSHOPS_STORAGE_BUCKET = "workshops";

const MAX_SAFE_NAME_LENGTH = 120;

/**
 * Sanitize an upload filename for Storage object keys.
 * Strips path segments, keeps [a-zA-Z0-9._-], collapses runs of separators.
 */
export function sanitizeWorkshopDocumentFileName(
  originalFileName: string
): string {
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

  const fallback = replaced.length > 0 ? replaced : "file";
  return fallback.slice(0, MAX_SAFE_NAME_LENGTH);
}

/**
 * Object key inside the public `workshops` bucket:
 * `{workshopId}/{uuid}-{safeName}`
 *
 * Full logical path used in DB `storage_path` includes the bucket prefix:
 * `workshops/{workshopId}/{uuid}-{safeName}`
 */
export function buildWorkshopDocumentStoragePath(
  workshopId: string,
  originalFileName: string,
  objectId: string = crypto.randomUUID()
): string {
  const safeName = sanitizeWorkshopDocumentFileName(originalFileName);
  return `${WORKSHOPS_STORAGE_BUCKET}/${workshopId}/${objectId}-${safeName}`;
}

/**
 * Returns bucket id and object key for Supabase Storage APIs.
 * `storagePath` is the DB value from `buildWorkshopDocumentStoragePath`.
 */
export function splitWorkshopDocumentStoragePath(storagePath: string): {
  bucket: string;
  objectPath: string;
} {
  const prefix = `${WORKSHOPS_STORAGE_BUCKET}/`;
  if (!storagePath.startsWith(prefix)) {
    return { bucket: WORKSHOPS_STORAGE_BUCKET, objectPath: storagePath };
  }
  return {
    bucket: WORKSHOPS_STORAGE_BUCKET,
    objectPath: storagePath.slice(prefix.length),
  };
}

/**
 * Public URL for a workshop document.
 * `supabaseUrl` is the project URL (e.g. NEXT_PUBLIC_SUPABASE_URL).
 */
export function getWorkshopDocumentPublicUrl(
  supabaseUrl: string,
  storagePath: string
): string {
  const { bucket, objectPath } = splitWorkshopDocumentStoragePath(storagePath);
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
}
