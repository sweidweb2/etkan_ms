export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

/** Largest original a user may choose (browser and server). */
export const AVATAR_MAX_INPUT_BYTES = 10 * 1024 * 1024;

/** Square edge in pixels for the stored avatar. */
export const AVATAR_SIZE = 512;

/** Browser pre-shrink target. The server pass is authoritative. */
export const AVATAR_TARGET_BYTES = 150 * 1024;

/** Server output cap. Must stay under the bucket `file_size_limit` (256 KB). */
export const AVATAR_OUTPUT_MAX_BYTES = 200 * 1024;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export const AVATAR_TYPE_ERROR = "Upload a JPEG, PNG, or WebP image.";
export const AVATAR_SIZE_ERROR = "Image must be at most 10 MB.";

function extensionOf(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot < 0) {
    return "";
  }
  return base.slice(dot).toLowerCase();
}

/** Reject empty files, SVG, GIF, and originals over 10 MB. */
export function avatarFileError(file: File): string | null {
  if (!(file instanceof File) || file.size <= 0) {
    return "Please choose an image file.";
  }

  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    return AVATAR_SIZE_ERROR;
  }

  const mime = file.type.trim().toLowerCase();
  const extension = extensionOf(file.name);
  const mimeOk = mime.length > 0 && ALLOWED_MIME_TYPES.has(mime);
  const extensionOk = extension.length > 0 && ALLOWED_EXTENSIONS.has(extension);

  if (!mimeOk && !extensionOk) {
    return AVATAR_TYPE_ERROR;
  }

  return null;
}
