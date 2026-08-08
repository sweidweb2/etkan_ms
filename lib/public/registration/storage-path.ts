export const REGISTRATION_STORAGE_BUCKET = "registration";

const MAX_SAFE_NAME_LENGTH = 120;

/**
 * Sanitize an upload filename for Storage object keys.
 */
export function sanitizeRegistrationDocumentFileName(
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
 * Temp path before application exists:
 * `registration/tmp/{uploadSessionId}/{uuid}-{safeName}`
 */
export function buildRegistrationTempStoragePath(
  uploadSessionId: string,
  originalFileName: string,
  objectId: string = crypto.randomUUID()
): string {
  const safeName = sanitizeRegistrationDocumentFileName(originalFileName);
  return `${REGISTRATION_STORAGE_BUCKET}/tmp/${uploadSessionId}/${objectId}-${safeName}`;
}

/**
 * Final path after application insert:
 * `registration/{applicationId}/{uuid}-{safeName}`
 */
export function buildRegistrationDocumentStoragePath(
  applicationId: string,
  originalFileName: string,
  objectId: string = crypto.randomUUID()
): string {
  const safeName = sanitizeRegistrationDocumentFileName(originalFileName);
  return `${REGISTRATION_STORAGE_BUCKET}/${applicationId}/${objectId}-${safeName}`;
}

export function splitRegistrationStoragePath(storagePath: string): {
  bucket: string;
  objectPath: string;
} {
  const prefix = `${REGISTRATION_STORAGE_BUCKET}/`;
  if (!storagePath.startsWith(prefix)) {
    return { bucket: REGISTRATION_STORAGE_BUCKET, objectPath: storagePath };
  }
  return {
    bucket: REGISTRATION_STORAGE_BUCKET,
    objectPath: storagePath.slice(prefix.length),
  };
}

export function isRegistrationTempStoragePath(
  storagePath: string,
  uploadSessionId: string
): boolean {
  const prefix = `${REGISTRATION_STORAGE_BUCKET}/tmp/${uploadSessionId}/`;
  return storagePath.startsWith(prefix);
}

export function extractRegistrationFileNameFromPath(storagePath: string): string {
  const segment = storagePath.split("/").pop() ?? "file";
  const withoutUuid = segment.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    ""
  );
  return withoutUuid || segment;
}
