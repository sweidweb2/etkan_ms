/**
 * Google Drive `uc?id=` links send `Cross-Origin-Resource-Policy: same-site`
 * (blocked as hotlinked `<img>` sources). Prefer the thumbnail endpoint, which
 * returns a cross-origin-safe JPEG and avoids googleusercontent rate limits.
 */
export function toEmbeddableGalleryImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return trimmed;
  }

  const host = parsed.hostname.toLowerCase();
  const isDriveHost =
    host === "drive.google.com" ||
    host === "docs.google.com" ||
    host.endsWith(".googleusercontent.com");

  if (!isDriveHost) {
    return trimmed;
  }

  const idFromQuery =
    parsed.searchParams.get("id")?.trim() ||
    parsed.searchParams.get("fileId")?.trim();

  const pathMatch = parsed.pathname.match(
    /\/(?:file\/d|uc\/d|d)\/([^/=]+)/i
  );
  const idFromPath = pathMatch?.[1]?.trim();

  // Already a googleusercontent /d/{id}… URL — extract id from path.
  const googleUserContentMatch = parsed.pathname.match(/^\/d\/([^/=]+)/i);
  const fileId =
    idFromQuery ||
    idFromPath ||
    (host.endsWith(".googleusercontent.com")
      ? googleUserContentMatch?.[1]?.trim()
      : undefined);

  if (!fileId) {
    return trimmed;
  }

  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1200`;
}
