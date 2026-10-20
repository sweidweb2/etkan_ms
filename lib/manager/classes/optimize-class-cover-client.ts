import {
  CLASS_COVER_INCOMING_MAX_BYTES,
  CLASS_COVER_MAX_EDGE,
  CLASS_COVER_TARGET_BYTES,
  classCoverFileError,
} from "@/lib/manager/classes/class-cover-file";

const QUALITY_STEPS = [0.82, 0.72, 0.62, 0.5, 0.4];

function scaledSize(width: number, height: number) {
  const longest = Math.max(width, height);
  const scale = longest > CLASS_COVER_MAX_EDGE ? CLASS_COVER_MAX_EDGE / longest : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function canvasSupportsWebp(): Promise<boolean> {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((next) => resolve(next), "image/webp", 0.8);
  });
  return blob?.type === "image/webp";
}

function blobToFile(blob: Blob, type: string): File {
  const extension = type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `class-cover.${extension}`, { type });
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
 * Shrink a chosen cover in the browser before it is sent.
 * Canvas export drops EXIF. WebP is preferred. JPEG is the fallback.
 */
export async function optimizeClassCoverInBrowser(
  file: File
): Promise<
  { ok: true; file: File; previewUrl: string } | { ok: false; error: string }
> {
  const invalid = classCoverFileError(file);
  if (invalid) {
    return { ok: false, error: invalid };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, error: "Upload a JPEG, PNG, or WebP image." };
  }

  try {
    const size = scaledSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) {
      return { ok: false, error: "Unable to prepare this image." };
    }
    context.drawImage(bitmap, 0, 0, size.width, size.height);

    const type = (await canvasSupportsWebp()) ? "image/webp" : "image/jpeg";
    let blob: Blob | null = null;

    for (const quality of QUALITY_STEPS) {
      blob = await exportCanvas(canvas, type, quality);
      if (blob && blob.size <= CLASS_COVER_TARGET_BYTES) {
        break;
      }
    }

    if (!blob || blob.size <= 0) {
      return { ok: false, error: "Unable to prepare this image." };
    }

    if (blob.size > CLASS_COVER_INCOMING_MAX_BYTES) {
      return {
        ok: false,
        error: "Image is still too large after preparation.",
      };
    }

    const optimized = blobToFile(blob, type);
    return {
      ok: true,
      file: optimized,
      previewUrl: URL.createObjectURL(optimized),
    };
  } finally {
    bitmap.close();
  }
}
