import { formatCourseGradeValue } from "@/lib/constants/manager-student-course-grade-display";
import { downloadBlob } from "@/lib/export/download-blob";
import {
  buildStudentGradeSheetPdfBytes,
  getStudentGradeSheetFilename,
} from "@/lib/export/student-grade-sheet-export";
import type { StudentGradeSheetOrientation } from "@/lib/export/student-grade-sheet-orientation";
import { buildStudentClassGradeSheetModel } from "@/lib/manager/student-class-grade-sheet";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ComputedStudentGradeSheetBundle } from "@/types/manager-student-course-grade";
import JSZip from "jszip";

type BuildComputedGradeCertificatesZipInput = {
  classRow: ManagerClassRow;
  bundles: ComputedStudentGradeSheetBundle[];
  orientation?: StudentGradeSheetOrientation;
};

export function getGradeCertificatesZipFilename(className: string): string {
  const slug =
    className
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "class";
  const date = new Date().toISOString().slice(0, 10);

  return `${slug}-grade-certificates-${date}.zip`;
}

function getTotalLabel(bundle: ComputedStudentGradeSheetBundle): string {
  return formatCourseGradeValue(bundle.gradeRow.total_grade);
}

/**
 * Builds one PDF per computed student into a ZIP.
 * Safe on Node (API route) and in the browser; prefer the server export path
 * so the UI thread is not blocked for full-class runs.
 */
export async function buildComputedGradeCertificatesZipBytes({
  classRow,
  bundles,
  orientation = "horizontal",
}: BuildComputedGradeCertificatesZipInput): Promise<{
  bytes: Uint8Array;
  count: number;
}> {
  const zip = new JSZip();
  const sortedBundles = [...bundles].sort((left, right) =>
    left.student.full_name.localeCompare(right.student.full_name)
  );

  for (const bundle of sortedBundles) {
    const model = buildStudentClassGradeSheetModel({
      student: bundle.student,
      classRow,
      gradeRow: bundle.gradeRow,
      detail: bundle.detail,
      finalExam: bundle.finalExam,
    });
    const pdfBytes = buildStudentGradeSheetPdfBytes(
      model,
      getTotalLabel(bundle),
      orientation
    );

    zip.file(
      getStudentGradeSheetFilename(bundle.student.full_name, "pdf"),
      pdfBytes
    );
  }

  const bytes = await zip.generateAsync({ type: "uint8array" });

  return {
    bytes,
    count: sortedBundles.length,
  };
}

export async function buildComputedGradeCertificatesZipBlob(
  input: BuildComputedGradeCertificatesZipInput
): Promise<{ blob: Blob; count: number }> {
  const { bytes, count } = await buildComputedGradeCertificatesZipBytes(input);
  return {
    blob: new Blob([Uint8Array.from(bytes)], { type: "application/zip" }),
    count,
  };
}

/** @deprecated Prefer server `/api/classes/[classId]/grade-certificates/zip`. */
export async function downloadComputedGradeCertificatesZip(
  input: BuildComputedGradeCertificatesZipInput
): Promise<number> {
  const { blob, count } = await buildComputedGradeCertificatesZipBlob(input);

  downloadBlob({
    blob,
    filename: getGradeCertificatesZipFilename(input.classRow.name),
  });

  return count;
}
