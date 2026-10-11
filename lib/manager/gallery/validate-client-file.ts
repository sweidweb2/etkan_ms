import {
  GALLERY_IMAGE_ALLOWED_EXTENSIONS,
  GALLERY_IMAGE_ALLOWED_MIME_TYPES,
  GALLERY_IMAGE_MAX_BYTES,
} from "@/lib/constants/manager-gallery";

const allowedMimeSet = new Set<string>(GALLERY_IMAGE_ALLOWED_MIME_TYPES);
const allowedExtensionSet = new Set<string>(GALLERY_IMAGE_ALLOWED_EXTENSIONS);
const MAX_MB = GALLERY_IMAGE_MAX_BYTES / (1024 * 1024);

function extensionOf(fileName: string): string {
  const base = fileName.replace(/\\/g, "/").split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot < 0) {
    return "";
  }
  return base.slice(dot).toLowerCase();
}

/**
 * Client-side pre-check before upload (UX). Server still validates + optimizes.
 */
export function validateGalleryImageClientFile(
  file: File | null | undefined
): { ok: true } | { ok: false; error: string } {
  if (!(file instanceof File) || file.size <= 0 || !file.name.trim()) {
    return { ok: false, error: "Please choose an image file." };
  }

  if (file.size > GALLERY_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      error: `Image must be at most ${MAX_MB} MB.`,
    };
  }

  const mime = file.type.trim().toLowerCase();
  const ext = extensionOf(file.name);
  const mimeOk = mime.length > 0 && allowedMimeSet.has(mime);
  const extOk = ext.length > 0 && allowedExtensionSet.has(ext);

  if (!mimeOk && !extOk) {
    return {
      ok: false,
      error: "Upload a JPEG, PNG, WebP, or GIF image.",
    };
  }

  return { ok: true };
}
