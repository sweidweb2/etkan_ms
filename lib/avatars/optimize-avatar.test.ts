import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  AVATAR_MAX_INPUT_BYTES,
  AVATAR_OUTPUT_MAX_BYTES,
  AVATAR_SIZE,
  avatarFileError,
} from "@/lib/avatars/avatar-file";
import { optimizeAvatarForStorage } from "@/lib/avatars/optimize-avatar";

async function jpegFile(width: number, height: number): Promise<File> {
  const bytes = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 120, b: 40 },
    },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Artist: "Secret Person" } } })
    .toBuffer();

  return new File([bytes], "photo.jpg", { type: "image/jpeg" });
}

describe("optimizeAvatarForStorage", () => {
  it("writes a 512px square webp under the output cap", async () => {
    const result = await optimizeAvatarForStorage(await jpegFile(1600, 900));

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.bytes.length).toBeLessThanOrEqual(AVATAR_OUTPUT_MAX_BYTES);
    const metadata = await sharp(result.bytes).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(AVATAR_SIZE);
    expect(metadata.height).toBe(AVATAR_SIZE);
    expect(metadata.exif).toBeUndefined();
  });

  it("rejects a file that is not an image", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "notes.txt", {
      type: "text/plain",
    });

    expect(await optimizeAvatarForStorage(file)).toEqual({
      ok: false,
      error: "Upload a JPEG, PNG, or WebP image.",
    });
  });

  it("rejects a GIF even when named like a JPEG", async () => {
    const gif = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#000" },
    })
      .gif()
      .toBuffer();
    const file = new File([gif], "photo.jpg", { type: "image/jpeg" });

    expect(await optimizeAvatarForStorage(file)).toEqual({
      ok: false,
      error: "Upload a JPEG, PNG, or WebP image.",
    });
  });

  it("rejects originals over 10 MB", async () => {
    const file = new File(
      [new Uint8Array(AVATAR_MAX_INPUT_BYTES + 1)],
      "huge.jpg",
      { type: "image/jpeg" }
    );

    expect(await optimizeAvatarForStorage(file)).toEqual({
      ok: false,
      error: "Image must be at most 10 MB.",
    });
  });
});

describe("avatarFileError", () => {
  it("rejects SVG and accepts PNG", () => {
    const svg = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
    const png = new File([new Uint8Array([1])], "me.png", {
      type: "image/png",
    });

    expect(avatarFileError(svg)).toBe("Upload a JPEG, PNG, or WebP image.");
    expect(avatarFileError(png)).toBeNull();
  });
});
