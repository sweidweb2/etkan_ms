import { describe, expect, it } from "vitest";
import {
  buildStudentTaskUploadZipEntryPath,
  getStudentTaskUploadsZipFilename,
  sanitizeZipPathSegment,
  uniqueZipSiblingName,
} from "@/lib/export/student-task-uploads-zip";

describe("student-task-uploads-zip helpers", () => {
  it("sanitizes path segments without slashes", () => {
    expect(sanitizeZipPathSegment("Ada / Lovelace")).toBe("Ada - Lovelace");
    expect(sanitizeZipPathSegment("../secret")).toBe("secret");
    expect(sanitizeZipPathSegment("   ")).toBe("untitled");
  });

  it("deduplicates sibling names", () => {
    const used = new Map<string, number>();
    expect(uniqueZipSiblingName("Ada", used)).toBe("Ada");
    expect(uniqueZipSiblingName("Ada", used)).toBe("Ada (2)");
    expect(uniqueZipSiblingName("ada", used)).toBe("ada (3)");
  });

  it("builds root/student/file entry paths", () => {
    expect(
      buildStudentTaskUploadZipEntryPath({
        rootFolder: "Homework 1",
        studentFolder: "Ada Lovelace",
        fileName: "notes.pdf",
      })
    ).toBe("Homework 1/Ada Lovelace/notes.pdf");
  });

  it("builds a dated zip filename from the task title", () => {
    expect(getStudentTaskUploadsZipFilename("Week 3 Review!")).toMatch(
      /^week-3-review-student-uploads-\d{4}-\d{2}-\d{2}\.zip$/
    );
  });
});
