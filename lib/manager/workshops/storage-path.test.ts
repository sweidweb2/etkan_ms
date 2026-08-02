import { describe, expect, it } from "vitest";
import {
  WORKSHOPS_STORAGE_BUCKET,
  buildWorkshopDocumentStoragePath,
  getWorkshopDocumentPublicUrl,
  sanitizeWorkshopDocumentFileName,
  splitWorkshopDocumentStoragePath,
} from "@/lib/manager/workshops/storage-path";

describe("sanitizeWorkshopDocumentFileName", () => {
  it("strips path segments and unsafe characters", () => {
    expect(sanitizeWorkshopDocumentFileName("../../syllabus (v1).pdf")).toBe(
      "syllabus-v1.pdf"
    );
  });

  it("falls back when name is empty after sanitize", () => {
    expect(sanitizeWorkshopDocumentFileName("***")).toBe("file");
  });
});

describe("buildWorkshopDocumentStoragePath", () => {
  it("builds workshops/{workshopId}/{uuid}-{safeName}", () => {
    const workshopId = "11111111-1111-4111-8111-111111111111";
    const objectId = "22222222-2222-4222-8222-222222222222";
    const path = buildWorkshopDocumentStoragePath(
      workshopId,
      "Syllabus Draft.pdf",
      objectId
    );
    expect(path).toBe(
      `${WORKSHOPS_STORAGE_BUCKET}/${workshopId}/${objectId}-Syllabus-Draft.pdf`
    );
  });
});

describe("splitWorkshopDocumentStoragePath", () => {
  it("splits bucket prefix from object path", () => {
    const { bucket, objectPath } = splitWorkshopDocumentStoragePath(
      "workshops/w1/abc-file.pdf"
    );
    expect(bucket).toBe(WORKSHOPS_STORAGE_BUCKET);
    expect(objectPath).toBe("w1/abc-file.pdf");
  });
});

describe("getWorkshopDocumentPublicUrl", () => {
  it("builds the public storage URL", () => {
    const url = getWorkshopDocumentPublicUrl(
      "https://example.supabase.co/",
      "workshops/w1/abc-file.pdf"
    );
    expect(url).toBe(
      "https://example.supabase.co/storage/v1/object/public/workshops/w1/abc-file.pdf"
    );
  });
});
