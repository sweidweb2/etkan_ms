import "server-only";

import sharp from "sharp";
import { runWithSharpLimit } from "@/lib/concurrency/heavy-cpu";
import {
  AVATAR_MAX_INPUT_BYTES,
  AVATAR_OUTPUT_MAX_BYTES,
  AVATAR_SIZE,
  AVATAR_SIZE_ERROR,
  AVATAR_TYPE_ERROR,
} from "@/lib/avatars/avatar-file";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

async function encodeWebp(input: Buffer, quality: number): Promise<Buffer> {
  return sharp(input, { failOn: "error" })
    .rotate()
    .resize({
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      fit: "cover",
      position: "attention",
    })
    .webp({ quality, effort: 6 })
    .toBuffer();
}

/**
 * Authoritative avatar pass: upright, 512px square, metadata stripped, WebP.
 * Runs even when the browser already shrank the file.
 */
export async function optimizeAvatarForStorage(
  file: File
): Promise<{ ok: true; bytes: Buffer } | { ok: false; error: string }> {
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, error: "Please choose an image file." };
  }

  if (file.size > AVATAR_MAX_INPUT_BYTES) {
    return { ok: false, error: AVATAR_SIZE_ERROR };
  }

  const input = Buffer.from(await file.arrayBuffer());

  return runWithSharpLimit(async () => {
    try {
      const metadata = await sharp(input, { failOn: "error" }).metadata();
      if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
        return { ok: false, error: AVATAR_TYPE_ERROR };
      }
    } catch {
      return { ok: false, error: AVATAR_TYPE_ERROR };
    }

    let quality = 80;
    let bytes = await encodeWebp(input, quality);

    while (bytes.length > AVATAR_OUTPUT_MAX_BYTES && quality > 40) {
      quality -= 10;
      bytes = await encodeWebp(input, quality);
    }

    if (bytes.length > AVATAR_OUTPUT_MAX_BYTES) {
      return {
        ok: false,
        error: "Image is still too large after optimization.",
      };
    }

    return { ok: true, bytes };
  });
}
