import { describe, expect, it } from "vitest";
import {
  GALLERY_STORAGE_BUCKET,
  buildGalleryImageStoragePath,
  getGalleryImageObjectPathFromPublicUrl,
  getGalleryImagePublicUrl,
  sanitizeGalleryImageFileName,
  splitGalleryImageStoragePath,
} from "@/lib/manager/gallery/storage-path";

describe("sanitizeGalleryImageFileName", () => {
  it("strips path segments and unsafe characters", () => {
    expect(sanitizeGalleryImageFileName("../../workshop (v1).png")).toBe(
      "workshop-v1.png"
    );
  });

  it("falls back when name is empty after sanitize", () => {
    expect(sanitizeGalleryImageFileName("***")).toBe("image");
  });
});

describe("buildGalleryImageStoragePath", () => {
  it("builds gallery/{uuid}-{safeName}", () => {
    const objectId = "22222222-2222-4222-8222-222222222222";
    const path = buildGalleryImageStoragePath("Workshop Card.png", objectId);
    expect(path).toBe(
      `${GALLERY_STORAGE_BUCKET}/${objectId}-Workshop-Card.png`
    );
  });
});

describe("splitGalleryImageStoragePath", () => {
  it("splits bucket prefix from object path", () => {
    const { bucket, objectPath } = splitGalleryImageStoragePath(
      "gallery/abc-file.webp"
    );
    expect(bucket).toBe(GALLERY_STORAGE_BUCKET);
    expect(objectPath).toBe("abc-file.webp");
  });
});

describe("getGalleryImagePublicUrl", () => {
  it("builds the public storage URL", () => {
    const url = getGalleryImagePublicUrl(
      "https://example.supabase.co/",
      "gallery/abc-file.webp"
    );
    expect(url).toBe(
      "https://example.supabase.co/storage/v1/object/public/gallery/abc-file.webp"
    );
  });
});

describe("getGalleryImageObjectPathFromPublicUrl", () => {
  it("extracts the object path from a gallery public URL", () => {
    expect(
      getGalleryImageObjectPathFromPublicUrl(
        "https://example.supabase.co/storage/v1/object/public/gallery/abc-file.webp"
      )
    ).toBe("abc-file.webp");
  });

  it("returns null for Drive / external URLs", () => {
    expect(
      getGalleryImageObjectPathFromPublicUrl(
        "https://drive.google.com/uc?id=abc"
      )
    ).toBeNull();
    expect(
      getGalleryImageObjectPathFromPublicUrl("https://cdn.example.com/a.png")
    ).toBeNull();
  });
});
