import { formatCourseGradeValue } from "@/lib/constants/manager-student-course-grade-display";
import { downloadBlob } from "@/lib/export/download-blob";
import {
  buildStudentGradeSheetPdfBlob,
  getStudentGradeSheetFilename,
} from "@/lib/export/student-grade-sheet-export";
import type { StudentGradeSheetOrientation } from "@/lib/export/student-grade-sheet-orientation";
import { buildStudentClassGradeSheetModel } from "@/lib/manager/student-class-grade-sheet";
import type { ComputedStudentGradeSheetBundle } from "@/services/classes/student-course-grade.service";
import type { ManagerClassRow } from "@/types/manager-class-list";
import JSZip from "jszip";

type DownloadComputedGradeCertificatesZipInput = {
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

export async function buildComputedGradeCertificatesZipBlob({
  classRow,
  bundles,
  orientation = "horizontal",
}: DownloadComputedGradeCertificatesZipInput): Promise<{
  blob: Blob;
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
    const pdfBlob = buildStudentGradeSheetPdfBlob(
      model,
      getTotalLabel(bundle),
      orientation
    );
    const pdfBuffer = await pdfBlob.arrayBuffer();

    zip.file(
      getStudentGradeSheetFilename(bundle.student.full_name, "pdf"),
      pdfBuffer
    );
  }

  const blob = await zip.generateAsync({ type: "blob" });

  return {
    blob,
    count: sortedBundles.length,
  };
}

export async function downloadComputedGradeCertificatesZip(
  input: DownloadComputedGradeCertificatesZipInput
): Promise<number> {
  const { blob, count } = await buildComputedGradeCertificatesZipBlob(input);

  downloadBlob({
    blob,
    filename: getGradeCertificatesZipFilename(input.classRow.name),
  });

  return count;
}
