import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { CLASS_COVER_OUTPUT_MAX_BYTES } from "@/lib/manager/classes/class-cover-file";
import { optimizeClassCoverForStorage } from "@/lib/manager/classes/optimize-class-cover";

async function pngFile(width: number, height: number): Promise<File> {
  const bytes = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 20, g: 80, b: 160 },
    },
  })
    .png()
    .toBuffer();

  return new File([bytes], "cover.png", { type: "image/png" });
}

describe("optimizeClassCoverForStorage", () => {
  it("writes a webp at or under the bucket cap and does not enlarge", async () => {
    const result = await optimizeClassCoverForStorage(await pngFile(2400, 800));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.bytes.length).toBeLessThanOrEqual(CLASS_COVER_OUTPUT_MAX_BYTES);
    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(1280);
    expect(metadata.height).toBeLessThanOrEqual(1280);
  });

  it("rejects a file that is not an image", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "notes.txt", {
      type: "text/plain",
    });

    const result = await optimizeClassCoverForStorage(file);

    expect(result).toEqual({
      ok: false,
      error: "Upload a JPEG, PNG, or WebP image.",
    });
  });
});
