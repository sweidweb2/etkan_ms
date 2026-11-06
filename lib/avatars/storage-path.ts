export const AVATARS_STORAGE_BUCKET = "avatars";

/**
 * Object key inside the avatars bucket: `{userId}/{uuid}.webp`.
 * A fresh uuid per upload keeps browser/CDN caches from serving the old photo.
 */
export function buildAvatarObjectPath(
  userId: string,
  objectId: string = crypto.randomUUID()
): string {
  return `${userId}/${objectId}.webp`;
}

/**
 * Object key inside the avatars bucket, if `avatarUrl` is a public
 * Storage URL for that bucket. Returns null for any other URL.
 */
export function getAvatarObjectPathFromPublicUrl(
  avatarUrl: string
): string | null {
  try {
    const parsed = new URL(avatarUrl);
    const marker = `/storage/v1/object/public/${AVATARS_STORAGE_BUCKET}/`;
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
