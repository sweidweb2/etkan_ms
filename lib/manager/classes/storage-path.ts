export const CLASS_COVERS_STORAGE_BUCKET = "class-covers";

/**
 * Logical path stored for Storage APIs:
 * `class-covers/{classId}/{uuid}.webp`
 */
export function buildClassCoverStoragePath(
  classId: string,
  objectId: string = crypto.randomUUID()
): string {
  return `${CLASS_COVERS_STORAGE_BUCKET}/${classId}/${objectId}.webp`;
}

export function splitClassCoverStoragePath(storagePath: string): {
  bucket: string;
  objectPath: string;
} {
  const prefix = `${CLASS_COVERS_STORAGE_BUCKET}/`;
  if (!storagePath.startsWith(prefix)) {
    return { bucket: CLASS_COVERS_STORAGE_BUCKET, objectPath: storagePath };
  }
  return {
    bucket: CLASS_COVERS_STORAGE_BUCKET,
    objectPath: storagePath.slice(prefix.length),
  };
}

/**
 * Object key inside the class-covers bucket, if `imageUrl` is a public
 * Storage URL for that bucket. Returns null for any other URL.
 */
export function getClassCoverObjectPathFromPublicUrl(
  imageUrl: string
): string | null {
  try {
    const parsed = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${CLASS_COVERS_STORAGE_BUCKET}/`;
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
