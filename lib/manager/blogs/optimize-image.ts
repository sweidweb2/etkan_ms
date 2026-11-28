import sharp from "sharp";
import { runWithSharpLimit } from "@/lib/concurrency/heavy-cpu";
import {
  BLOG_IMAGE_AVATAR_MAX_EDGE,
  BLOG_IMAGE_MAX_BYTES,
  BLOG_IMAGE_THUMBNAIL_MAX_EDGE,
  BLOG_IMAGE_WEBP_QUALITY,
} from "@/lib/constants/manager-blog";
import { sanitizeBlogImageFileName } from "@/lib/manager/blogs/storage-path";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif"]);

export type BlogImageKind = "thumbnail" | "avatar";

export type OptimizeBlogImageSuccess = {
  success: true;
  buffer: Buffer;
  contentType: "image/webp";
  fileName: string;
};

export type OptimizeBlogImageFailure = {
  success: false;
  error: string;
};

export type OptimizeBlogImageResult =
  | OptimizeBlogImageSuccess
  | OptimizeBlogImageFailure;

function webpFileNameFromOriginal(originalFileName: string): string {
  const safe = sanitizeBlogImageFileName(originalFileName);
  const withoutExt = safe.replace(/\.[^.]+$/, "");
  const base = withoutExt.length > 0 ? withoutExt : "image";
  return `${base}.webp`;
}

/**
 * Authoritative blog image pass: decode via Sharp, resize, strip metadata, WebP.
 */
export async function optimizeBlogImage(input: {
  bytes: ArrayBuffer | Buffer;
  originalFileName: string;
  kind: BlogImageKind;
  byteLength?: number;
}): Promise<OptimizeBlogImageResult> {
  const byteLength =
    input.byteLength ??
    (Buffer.isBuffer(input.bytes)
      ? input.bytes.byteLength
      : input.bytes.byteLength);

  if (byteLength <= 0) {
    return { success: false, error: "Image file is empty." };
  }

  if (byteLength > BLOG_IMAGE_MAX_BYTES) {
    return {
      success: false,
      error: "Image must be 5 MB or smaller.",
    };
  }

  const source = Buffer.isBuffer(input.bytes)
    ? input.bytes
    : Buffer.from(input.bytes);

  const isAvatar = input.kind === "avatar";
  const maxEdge = isAvatar
    ? BLOG_IMAGE_AVATAR_MAX_EDGE
    : BLOG_IMAGE_THUMBNAIL_MAX_EDGE;

  return runWithSharpLimit(async () => {
    try {
      const metadata = await sharp(source, { failOn: "error" }).metadata();
      if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
        return {
          success: false,
          error: "Image must be JPEG, PNG, WebP, or GIF.",
        };
      }

      let pipeline = sharp(source, { failOn: "error" }).rotate();
      if (isAvatar) {
        pipeline = pipeline.resize({
          width: maxEdge,
          height: maxEdge,
          fit: "cover",
          position: "attention",
        });
      } else {
        pipeline = pipeline.resize({
          width: maxEdge,
          height: maxEdge,
          fit: "inside",
          withoutEnlargement: true,
        });
      }

      const buffer = await pipeline
        .webp({ quality: BLOG_IMAGE_WEBP_QUALITY })
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
  });
}
