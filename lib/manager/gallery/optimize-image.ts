import sharp from "sharp";
import {
  GALLERY_IMAGE_MAX_BYTES,
  GALLERY_IMAGE_MAX_EDGE,
  GALLERY_IMAGE_WEBP_QUALITY,
} from "@/lib/constants/manager-gallery";
import { sanitizeGalleryImageFileName } from "@/lib/manager/gallery/storage-path";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

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
 * Authoritative gallery pass. Decodes via Sharp (rejects spoofed MIME),
 * resizes, strips metadata, and stores WebP.
 */
export async function optimizeGalleryImage(input: {
  bytes: ArrayBuffer | Buffer;
  originalFileName: string;
  byteLength?: number;
}): Promise<OptimizeGalleryImageResult> {
  const byteLength =
    input.byteLength ??
    (Buffer.isBuffer(input.bytes)
      ? input.bytes.byteLength
      : input.bytes.byteLength);

  if (byteLength <= 0) {
    return { success: false, error: "Image file is empty." };
  }

  if (byteLength > GALLERY_IMAGE_MAX_BYTES) {
    return {
      success: false,
      error: "Image must be 15 MB or smaller.",
    };
  }

  const source = Buffer.isBuffer(input.bytes)
    ? input.bytes
    : Buffer.from(input.bytes);

  try {
    const metadata = await sharp(source, { failOn: "error" }).metadata();
    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
      return {
        success: false,
        error: "Image must be JPEG, PNG, WebP, or GIF.",
      };
    }

    const buffer = await sharp(source, { failOn: "error" })
      .rotate()
      .resize({
        width: GALLERY_IMAGE_MAX_EDGE,
        height: GALLERY_IMAGE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: GALLERY_IMAGE_WEBP_QUALITY })
      .toBuffer();

    const encoded = await sharp(buffer, { failOn: "error" }).metadata();
    if (encoded.format !== "webp" || !encoded.width || !encoded.height) {
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
