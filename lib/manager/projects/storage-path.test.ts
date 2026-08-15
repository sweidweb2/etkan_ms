import { describe, expect, it } from "vitest";
import {
  PROJECTS_STORAGE_BUCKET,
  buildProjectImageStoragePath,
  getProjectImageObjectPathFromPublicUrl,
  getProjectImagePublicUrl,
  sanitizeProjectImageFileName,
  splitProjectImageStoragePath,
} from "@/lib/manager/projects/storage-path";

describe("sanitizeProjectImageFileName", () => {
  it("strips path segments and unsafe characters", () => {
    expect(sanitizeProjectImageFileName("../../card (v1).png")).toBe(
      "card-v1.png"
    );
  });

  it("falls back when name is empty after sanitize", () => {
    expect(sanitizeProjectImageFileName("***")).toBe("image");
  });
});

describe("buildProjectImageStoragePath", () => {
  it("builds projects/{uuid}-{safeName}", () => {
    const objectId = "22222222-2222-4222-8222-222222222222";
    const path = buildProjectImageStoragePath("Portal Card.png", objectId);
    expect(path).toBe(
      `${PROJECTS_STORAGE_BUCKET}/${objectId}-Portal-Card.png`
    );
  });
});

describe("splitProjectImageStoragePath", () => {
  it("splits bucket prefix from object path", () => {
    const { bucket, objectPath } = splitProjectImageStoragePath(
      "projects/abc-file.png"
    );
    expect(bucket).toBe(PROJECTS_STORAGE_BUCKET);
    expect(objectPath).toBe("abc-file.png");
  });
});

describe("getProjectImagePublicUrl", () => {
  it("builds the public storage URL", () => {
    const url = getProjectImagePublicUrl(
      "https://example.supabase.co/",
      "projects/abc-file.png"
    );
    expect(url).toBe(
      "https://example.supabase.co/storage/v1/object/public/projects/abc-file.png"
    );
  });
});

describe("getProjectImageObjectPathFromPublicUrl", () => {
  it("extracts the object path from a projects public URL", () => {
    expect(
      getProjectImageObjectPathFromPublicUrl(
        "https://example.supabase.co/storage/v1/object/public/projects/abc-file.png"
      )
    ).toBe("abc-file.png");
  });

  it("returns null for external URLs", () => {
    expect(
      getProjectImageObjectPathFromPublicUrl("https://cdn.example.com/a.png")
    ).toBeNull();
  });
});
