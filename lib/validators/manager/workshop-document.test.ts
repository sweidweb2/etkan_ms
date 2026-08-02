import { describe, expect, it } from "vitest";
import {
  parseUploadWorkshopDocumentFormData,
  renameWorkshopDocumentSchema,
  uploadWorkshopDocumentSchema,
} from "@/lib/validators/manager/workshop-document";

const workshopId = "11111111-1111-4111-8111-111111111111";
const documentId = "22222222-2222-4222-8222-222222222222";

function makeFile(
  name: string,
  type: string,
  sizeBytes: number
): File {
  const content = new Uint8Array(Math.max(sizeBytes, 1));
  return new File([content], name, { type });
}

describe("uploadWorkshopDocumentSchema", () => {
  it("accepts a valid PDF and defaults name from file", () => {
    const file = makeFile("syllabus.pdf", "application/pdf", 1024);
    const parsed = uploadWorkshopDocumentSchema.safeParse({
      workshop_id: workshopId,
      file,
      name: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("syllabus.pdf");
    }
  });

  it("uses provided display name when present", () => {
    const file = makeFile("syllabus.pdf", "application/pdf", 1024);
    const parsed = uploadWorkshopDocumentSchema.safeParse({
      workshop_id: workshopId,
      file,
      name: "Week 1 syllabus",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Week 1 syllabus");
    }
  });

  it("rejects disallowed mime types", () => {
    const file = makeFile("virus.exe", "application/octet-stream", 1024);
    const parsed = uploadWorkshopDocumentSchema.safeParse({
      workshop_id: workshopId,
      file,
      name: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects files over 10 MB", () => {
    const file = makeFile(
      "huge.pdf",
      "application/pdf",
      10 * 1024 * 1024 + 1
    );
    const parsed = uploadWorkshopDocumentSchema.safeParse({
      workshop_id: workshopId,
      file,
      name: "",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("renameWorkshopDocumentSchema", () => {
  it("requires a non-empty name", () => {
    expect(
      renameWorkshopDocumentSchema.safeParse({
        id: documentId,
        workshop_id: workshopId,
        name: "Updated name",
      }).success
    ).toBe(true);
    expect(
      renameWorkshopDocumentSchema.safeParse({
        id: documentId,
        workshop_id: workshopId,
        name: "   ",
      }).success
    ).toBe(false);
  });
});

describe("parseUploadWorkshopDocumentFormData", () => {
  it("parses FormData with a file", () => {
    const formData = new FormData();
    formData.set("workshop_id", workshopId);
    formData.set("name", "Handout");
    formData.set("file", makeFile("handout.pdf", "application/pdf", 512));

    const parsed = parseUploadWorkshopDocumentFormData(formData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Handout");
      expect(parsed.data.file.type).toBe("application/pdf");
    }
  });
});
