import { describe, expect, it } from "vitest";
import { GALLERY_IMAGE_MAX_BYTES } from "@/lib/constants/manager-gallery";
import { validateGalleryImageClientFile } from "@/lib/manager/gallery/validate-client-file";

function makeFile(
  name: string,
  type: string,
  size = 32
): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateGalleryImageClientFile", () => {
  it("accepts a valid png", () => {
    expect(validateGalleryImageClientFile(makeFile("a.png", "image/png"))).toEqual(
      { ok: true }
    );
  });

  it("accepts jpg by extension when mime is empty", () => {
    expect(validateGalleryImageClientFile(makeFile("shot.jpg", ""))).toEqual({
      ok: true,
    });
  });

  it("rejects oversize files", () => {
    const file = makeFile("big.png", "image/png", 32);
    Object.defineProperty(file, "size", {
      value: GALLERY_IMAGE_MAX_BYTES + 1,
    });
    const result = validateGalleryImageClientFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/15/);
    }
  });

  it("rejects unsupported types", () => {
    const result = validateGalleryImageClientFile(
      makeFile("notes.pdf", "application/pdf")
    );
    expect(result.ok).toBe(false);
  });
});
