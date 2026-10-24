import sharp from "sharp";
import type { StudentTaskUploadAllowedMimeType } from "@/lib/constants/manager-student-task-uploads";

const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const GIF87 = Buffer.from("GIF87a");
const GIF89 = Buffer.from("GIF89a");
const PDF = Buffer.from("%PDF");
const OLE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

function startsWith(bytes: Buffer, signature: Buffer): boolean {
  return (
    bytes.length >= signature.length &&
    bytes.subarray(0, signature.length).equals(signature)
  );
}

function isWebp(bytes: Buffer): boolean {
  return (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function zipContainsPath(bytes: Buffer, pathFragment: string): boolean {
  return bytes.includes(Buffer.from(pathFragment));
}

function looksLikePlainText(bytes: Buffer): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 4096));
  if (sample.includes(0)) {
    return false;
  }

  let suspicious = 0;
  for (const value of sample) {
    if (value < 0x09 || (value > 0x0d && value < 0x20) || value === 0x7f) {
      suspicious += 1;
    }
  }

  return suspicious / Math.max(sample.length, 1) < 0.05;
}

async function assertDecodableImage(
  bytes: Buffer,
  format: "jpeg" | "png" | "webp" | "gif"
): Promise<boolean> {
  try {
    const metadata = await sharp(bytes, { failOn: "error" }).metadata();
    return metadata.format === format;
  } catch {
    return false;
  }
}

/**
 * Authoritative content sniff for student task uploads.
 * Ignores browser-reported MIME; rejects spoofed / polyglot payloads.
 */
export async function inspectStudentTaskUploadBytes(
  bytes: Buffer
): Promise<
  | { ok: true; mime: StudentTaskUploadAllowedMimeType }
  | { ok: false; error: string }
> {
  if (bytes.length === 0) {
    return { ok: false, error: "File is empty." };
  }

  if (startsWith(bytes, PDF)) {
    return { ok: true, mime: "application/pdf" };
  }

  if (startsWith(bytes, JPEG)) {
    if (!(await assertDecodableImage(bytes, "jpeg"))) {
      return { ok: false, error: "File type is not allowed." };
    }
    return { ok: true, mime: "image/jpeg" };
  }

  if (startsWith(bytes, PNG)) {
    if (!(await assertDecodableImage(bytes, "png"))) {
      return { ok: false, error: "File type is not allowed." };
    }
    return { ok: true, mime: "image/png" };
  }

  if (isWebp(bytes)) {
    if (!(await assertDecodableImage(bytes, "webp"))) {
      return { ok: false, error: "File type is not allowed." };
    }
    return { ok: true, mime: "image/webp" };
  }

  if (startsWith(bytes, GIF87) || startsWith(bytes, GIF89)) {
    if (!(await assertDecodableImage(bytes, "gif"))) {
      return { ok: false, error: "File type is not allowed." };
    }
    return { ok: true, mime: "image/gif" };
  }

  if (startsWith(bytes, OLE)) {
    return { ok: true, mime: "application/msword" };
  }

  if (startsWith(bytes, ZIP)) {
    if (zipContainsPath(bytes, "word/")) {
      return {
        ok: true,
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }
    if (zipContainsPath(bytes, "xl/")) {
      return {
        ok: true,
        mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }
    if (zipContainsPath(bytes, "ppt/")) {
      return {
        ok: true,
        mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      };
    }
    return { ok: false, error: "File type is not allowed." };
  }

  if (looksLikePlainText(bytes)) {
    return { ok: true, mime: "text/plain" };
  }

  return { ok: false, error: "File type is not allowed." };
}
