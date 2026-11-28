import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { optimizeBlogImage } from "@/lib/manager/blogs/optimize-image";

async function pngBytes(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 40, g: 80, b: 120 },
    },
  })
    .png()
    .toBuffer();
}

describe("optimizeBlogImage", () => {
  it("writes a webp thumbnail without enlarging small images", async () => {
    const source = await pngBytes(400, 300);
    const result = await optimizeBlogImage({
      bytes: source,
      originalFileName: "Cover Photo.PNG",
      kind: "thumbnail",
    });
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    expect(result.contentType).toBe("image/webp");
    expect(result.fileName).toBe("Cover-Photo.webp");
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(300);
  });

  it("crops author avatars to a square webp", async () => {
    const source = await pngBytes(900, 600);
    const result = await optimizeBlogImage({
      bytes: source,
      originalFileName: "author.jpg",
      kind: "avatar",
    });
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }
    const meta = await sharp(result.buffer).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });

  it("rejects empty files", async () => {
    const result = await optimizeBlogImage({
      bytes: Buffer.alloc(0),
      originalFileName: "empty.png",
      kind: "thumbnail",
    });
    expect(result).toEqual({
      success: false,
      error: "Image file is empty.",
    });
  });
});
