import sharp from "sharp";
import { runWithSharpLimit } from "@/lib/concurrency/heavy-cpu";
import {
  CLASS_COVER_INCOMING_MAX_BYTES,
  CLASS_COVER_MAX_EDGE,
  CLASS_COVER_OUTPUT_MAX_BYTES,
} from "@/lib/manager/classes/class-cover-file";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

async function encodeWebp(input: Buffer, quality: number): Promise<Buffer> {
  return sharp(input, { failOn: "error" })
    .rotate()
    .resize({
      width: CLASS_COVER_MAX_EDGE,
      height: CLASS_COVER_MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality, effort: 6 })
    .toBuffer();
}

/**
 * Authoritative cover pass. Resizes, strips metadata, and writes WebP
 * even when the browser already compressed the file.
 */
export async function optimizeClassCoverForStorage(
  file: File
): Promise<{ ok: true; bytes: Buffer } | { ok: false; error: string }> {
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, error: "Please choose an image file." };
  }

  if (file.size > CLASS_COVER_INCOMING_MAX_BYTES) {
    return {
      ok: false,
      error: "Image must be at most 1 MB after preparation.",
    };
  }

  const input = Buffer.from(await file.arrayBuffer());

  return runWithSharpLimit(async () => {
    try {
      const metadata = await sharp(input, { failOn: "error" }).metadata();
      if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
        return { ok: false, error: "Upload a JPEG, PNG, or WebP image." };
      }
    } catch {
      return { ok: false, error: "Upload a JPEG, PNG, or WebP image." };
    }

    let quality = 72;
    let bytes = await encodeWebp(input, quality);

    while (bytes.length > CLASS_COVER_OUTPUT_MAX_BYTES && quality > 40) {
      quality -= 8;
      bytes = await encodeWebp(input, quality);
    }

    if (bytes.length > CLASS_COVER_OUTPUT_MAX_BYTES) {
      return {
        ok: false,
        error: "Image is still too large after optimization.",
      };
    }

    return { ok: true, bytes };
  });
}
