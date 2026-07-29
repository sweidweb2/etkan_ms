import { afterEach, describe, expect, it } from "vitest";
import { unlink } from "node:fs/promises";
import path from "node:path";
import {
  buildStudentGradeSheetDocHtml,
  downloadStudentGradeSheetPdf,
  getStudentGradeSheetFilename,
} from "@/lib/export/student-grade-sheet-export";
import type { StudentClassGradeSheetModel } from "@/lib/manager/student-class-grade-sheet";

const model: StudentClassGradeSheetModel = {
  studentName: "Sara Ahmed",
  course: {
    className: "Robotics A",
    subjectName: "Robotics",
    semesterName: "Fall 2026",
    enrollmentStatus: "active",
    joinedAt: "2026-02-01T00:00:00.000Z",
    computeType: null,
    totalGrade: 86.5,
    isComputed: false,
  },
  attendance: { presentCount: 5, totalSessions: 8 },
  groupGradeSlots: [
    { sessionLabel: "S1", gradeLabel: "High" },
    { sessionLabel: "S2", gradeLabel: "Medium" },
  ],
  taskRows: [
    {
      title: "Build a robot arm",
      sessionLabel: "S1",
      grade: 90,
      maxGrade: 100,
      status: "graded",
    },
  ],
  mainFactors: {
    tasks: { grade: 87.5, weight: 60, contribution: 52.5 },
    finalExam: { grade: 85, weight: 40, contribution: 34, title: "Final exam" },
    previewTotal: 86.5,
  },
  generatedAt: "2026-07-12T00:00:00.000Z",
};

const generatedPdfPaths = new Set<string>();

afterEach(async () => {
  const paths = [...generatedPdfPaths];
  generatedPdfPaths.clear();

  await Promise.all(
    paths.map(async (filePath) => {
      try {
        await unlink(filePath);
      } catch {
        // File may already be gone or never written in some environments.
      }
    })
  );
});

describe("student grade sheet export", () => {
  it("builds a safe doc filename slug", () => {
    expect(getStudentGradeSheetFilename("Sara Ahmed", "pdf")).toMatch(
      /^sara-ahmed-grade-sheet-\d{4}-\d{2}-\d{2}\.pdf$/
    );
  });

  it("builds word-compatible html with certificate sections", () => {
    const html = buildStudentGradeSheetDocHtml(model, "86.5 (preview)");

    expect(html).toContain("Official grade certificate");
    expect(html).toContain("Sara Ahmed");
    expect(html).toContain("5 / 8 sessions");
    expect(html).toContain("Build a robot arm");
    expect(html).toContain("Group grades by session");
    expect(html).toContain("Course total");
    expect(html).toContain("86.5 (preview)");
    expect(html).toContain("size: A4 landscape");
    expect(html).not.toContain("<script");
  });

  it("builds vertical doc html with portrait page size and stacked layout", () => {
    const html = buildStudentGradeSheetDocHtml(
      model,
      "86.5 (preview)",
      "vertical"
    );

    expect(html).toContain("size: A4 portrait");
    expect(html).toContain("Group grades by session");
    expect(html).toContain("Session");
    expect(html).toContain("Grade");
    expect(html).not.toContain("Group grades by session</th></tr><tr><th");
  });

  it("builds a pdf document from the grade sheet model", () => {
    const filename = getStudentGradeSheetFilename(model.studentName, "pdf");
    generatedPdfPaths.add(path.join(process.cwd(), filename));

    expect(() =>
      downloadStudentGradeSheetPdf(model, "86.5 (preview)", "horizontal")
    ).not.toThrow();
    expect(() =>
      downloadStudentGradeSheetPdf(model, "86.5 (preview)", "vertical")
    ).not.toThrow();
  });
});
