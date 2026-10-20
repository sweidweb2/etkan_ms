export const CLASS_COVER_ACCEPT = "image/jpeg,image/png,image/webp";

/** Largest original the browser will try to shrink. */
export const CLASS_COVER_MAX_INPUT_BYTES = 20 * 1024 * 1024;

/** Largest file the server will accept before the sharp pass. */
export const CLASS_COVER_INCOMING_MAX_BYTES = 1024 * 1024;

/** Browser target. The sharp pass may still go a little higher. */
export const CLASS_COVER_TARGET_BYTES = 400 * 1024;

/** Bucket cap. Sharp must finish at or under this size. */
export const CLASS_COVER_OUTPUT_MAX_BYTES = 512 * 1024;

export const CLASS_COVER_MAX_EDGE = 1280;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function extensionOf(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot < 0) {
    return "";
  }
  return base.slice(dot).toLowerCase();
}

/** Reject empty files, SVG, GIF, and originals the browser should not decode. */
export function classCoverFileError(file: File): string | null {
  if (!(file instanceof File) || file.size <= 0 || !file.name.trim()) {
    return "Please choose an image file.";
  }

  if (file.size > CLASS_COVER_MAX_INPUT_BYTES) {
    return "Image must be at most 20 MB.";
  }

  const mime = file.type.trim().toLowerCase();
  const extension = extensionOf(file.name);
  const mimeOk = mime.length > 0 && ALLOWED_MIME_TYPES.has(mime);
  const extensionOk = extension.length > 0 && ALLOWED_EXTENSIONS.has(extension);

  if (!mimeOk && !extensionOk) {
    return "Upload a JPEG, PNG, or WebP image.";
  }

  return null;
}
