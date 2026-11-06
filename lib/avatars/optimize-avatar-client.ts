import {
  AVATAR_SIZE,
  AVATAR_TARGET_BYTES,
  avatarFileError,
} from "@/lib/avatars/avatar-file";

const QUALITY_STEPS = [0.86, 0.78, 0.7, 0.6, 0.5];

async function canvasSupportsWebp(): Promise<boolean> {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), "image/webp", 0.8);
  });
  return blob?.type === "image/webp";
}

async function exportCanvas(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Center-crop to a square and shrink to the avatar size in the browser
 * so the upload is small. Canvas export drops EXIF. WebP is preferred,
 * JPEG is the fallback. The server pass still re-encodes.
 */
export async function optimizeAvatarInBrowser(
  file: File
): Promise<
  { ok: true; file: File; previewUrl: string } | { ok: false; error: string }
> {
  const invalid = avatarFileError(file);
  if (invalid) {
    return { ok: false, error: invalid };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return { ok: false, error: "Upload a JPEG, PNG, or WebP image." };
  }

  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sourceX = Math.round((bitmap.width - side) / 2);
    const sourceY = Math.round((bitmap.height - side) / 2);
    const target = Math.min(AVATAR_SIZE, side);

    const canvas = document.createElement("canvas");
    canvas.width = target;
    canvas.height = target;
    const context = canvas.getContext("2d");
    if (!context) {
      return { ok: false, error: "Unable to prepare this image." };
    }
    context.drawImage(bitmap, sourceX, sourceY, side, side, 0, 0, target, target);

    const type = (await canvasSupportsWebp()) ? "image/webp" : "image/jpeg";
    let blob: Blob | null = null;

    for (const quality of QUALITY_STEPS) {
      blob = await exportCanvas(canvas, type, quality);
      if (blob && blob.size <= AVATAR_TARGET_BYTES) {
        break;
      }
    }

    if (!blob || blob.size <= 0) {
      return { ok: false, error: "Unable to prepare this image." };
    }

    const extension = type === "image/webp" ? "webp" : "jpg";
    const prepared = new File([blob], `avatar.${extension}`, { type });
    return {
      ok: true,
      file: prepared,
      previewUrl: URL.createObjectURL(prepared),
    };
  } finally {
    bitmap.close();
  }
}
