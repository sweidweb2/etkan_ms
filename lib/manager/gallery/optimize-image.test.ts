import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { GALLERY_IMAGE_MAX_BYTES } from "@/lib/constants/manager-gallery";
import { optimizeGalleryImage } from "@/lib/manager/gallery/optimize-image";

async function makePngBytes(width = 32, height = 32): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 20, g: 40, b: 60 },
    },
  })
    .png()
    .toBuffer();
}

describe("optimizeGalleryImage", () => {
  it("rejects invalid mime types", async () => {
    const result = await optimizeGalleryImage({
      bytes: Buffer.from("not-an-image"),
      mimeType: "application/pdf",
      originalFileName: "doc.pdf",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/JPEG|PNG|WebP|GIF/i);
    }
  });

  it("rejects oversize files before processing", async () => {
    const result = await optimizeGalleryImage({
      bytes: Buffer.alloc(16),
      mimeType: "image/png",
      originalFileName: "huge.png",
      byteLength: GALLERY_IMAGE_MAX_BYTES + 1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/15 MB/i);
    }
  });

  it("encodes a valid PNG as WebP", async () => {
    const png = await makePngBytes();
    const result = await optimizeGalleryImage({
      bytes: png,
      mimeType: "image/png",
      originalFileName: "Workshop Card.png",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.contentType).toBe("image/webp");
      expect(result.fileName).toBe("Workshop-Card.webp");
      expect(result.buffer.byteLength).toBeGreaterThan(0);
      const meta = await sharp(result.buffer).metadata();
      expect(meta.format).toBe("webp");
    }
  });
});
