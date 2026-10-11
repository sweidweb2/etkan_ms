import sharp from "sharp";
import {
  GALLERY_IMAGE_ALLOWED_MIME_TYPES,
  GALLERY_IMAGE_MAX_BYTES,
  GALLERY_IMAGE_MAX_EDGE,
  GALLERY_IMAGE_WEBP_QUALITY,
} from "@/lib/constants/manager-gallery";
import { sanitizeGalleryImageFileName } from "@/lib/manager/gallery/storage-path";

const allowedMimeSet = new Set<string>(GALLERY_IMAGE_ALLOWED_MIME_TYPES);

export type OptimizeGalleryImageSuccess = {
  success: true;
  buffer: Buffer;
  contentType: "image/webp";
  fileName: string;
};

export type OptimizeGalleryImageFailure = {
  success: false;
  error: string;
};

export type OptimizeGalleryImageResult =
  | OptimizeGalleryImageSuccess
  | OptimizeGalleryImageFailure;

function webpFileNameFromOriginal(originalFileName: string): string {
  const safe = sanitizeGalleryImageFileName(originalFileName);
  const withoutExt = safe.replace(/\.[^.]+$/, "");
  const base = withoutExt.length > 0 ? withoutExt : "image";
  return `${base}.webp`;
}

/**
 * Validate size/mime, then resize (max edge) and encode as WebP (strips metadata).
 */
export async function optimizeGalleryImage(input: {
  bytes: ArrayBuffer | Buffer;
  mimeType: string;
  originalFileName: string;
  byteLength?: number;
}): Promise<OptimizeGalleryImageResult> {
  const mimeType = input.mimeType.trim().toLowerCase();
  const byteLength =
    input.byteLength ??
    (Buffer.isBuffer(input.bytes)
      ? input.bytes.byteLength
      : input.bytes.byteLength);

  if (!allowedMimeSet.has(mimeType)) {
    return {
      success: false,
      error: "Image must be JPEG, PNG, WebP, or GIF.",
    };
  }

  if (byteLength <= 0) {
    return { success: false, error: "Image file is empty." };
  }

  if (byteLength > GALLERY_IMAGE_MAX_BYTES) {
    return {
      success: false,
      error: "Image must be 15 MB or smaller.",
    };
  }

  try {
    const source = Buffer.isBuffer(input.bytes)
      ? input.bytes
      : Buffer.from(input.bytes);

    const buffer = await sharp(source)
      .rotate()
      .resize({
        width: GALLERY_IMAGE_MAX_EDGE,
        height: GALLERY_IMAGE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: GALLERY_IMAGE_WEBP_QUALITY })
      .toBuffer();

    // Guard against bad encodes before we store a public URL.
    const meta = await sharp(buffer).metadata();
    if (meta.format !== "webp" || !meta.width || !meta.height) {
      return {
        success: false,
        error: "Unable to process image. Use a valid JPEG, PNG, WebP, or GIF.",
      };
    }

    return {
      success: true,
      buffer,
      contentType: "image/webp",
      fileName: webpFileNameFromOriginal(input.originalFileName),
    };
  } catch {
    return {
      success: false,
      error: "Unable to process image. Use a valid JPEG, PNG, WebP, or GIF.",
    };
  }
}
