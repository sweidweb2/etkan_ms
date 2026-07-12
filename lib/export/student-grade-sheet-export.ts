import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatCourseGradeValue,
  formatCourseGradeWeight,
  getManagerStudentCourseGradeTypeLabel,
} from "@/lib/constants/manager-student-course-grade-display";
import { downloadBlob } from "@/lib/export/download-blob";
import {
  getDocPageSizeCss,
  getJsPdfOrientation,
  isVerticalGradeSheetOrientation,
  type StudentGradeSheetOrientation,
} from "@/lib/export/student-grade-sheet-orientation";
import type { StudentClassGradeSheetModel } from "@/lib/manager/student-class-grade-sheet";

type GradeSheetPdfDocument = jsPDF & {
  lastAutoTable?: {
    finalY: number;
  };
};

const PDF_TABLE_STYLES = {
  fontSize: 8,
  cellPadding: 1.8,
  lineColor: [100, 116, 139] as [number, number, number],
  lineWidth: 0.1,
  textColor: [15, 23, 42] as [number, number, number],
};

const PDF_HEAD_STYLES = {
  fillColor: [241, 245, 249] as [number, number, number],
  textColor: [51, 65, 85] as [number, number, number],
  fontStyle: "bold" as const,
};

const PDF_LABEL_COLUMN_STYLES = {
  fontStyle: "bold" as const,
  fillColor: [241, 245, 249] as [number, number, number],
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function getStudentGradeSheetFilename(
  studentName: string,
  extension: "pdf" | "doc"
): string {
  const slug =
    studentName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "student";
  const date = new Date().toISOString().slice(0, 10);

  return `${slug}-grade-sheet-${date}.${extension}`;
}

function tableCell(
  content: string,
  options?: {
    header?: boolean;
    align?: "left" | "center" | "right";
    colspan?: number;
    bold?: boolean;
  }
) {
  const tag = options?.header ? "th" : "td";
  const align = options?.align ?? "left";
  const colspan = options?.colspan ? ` colspan="${options.colspan}"` : "";
  const style = [
    "border:1px solid #64748b",
    "padding:6px 8px",
    "font-size:11px",
    `text-align:${align}`,
    options?.header
      ? "background:#f1f5f9;font-weight:600;text-transform:uppercase;"
      : "",
    options?.bold ? "font-weight:700;" : "",
  ].join(";");

  return `<${tag}${colspan} style="${style}">${escapeHtml(content)}</${tag}>`;
}

function getSheetComputeStatus(model: StudentClassGradeSheetModel): string {
  return model.course.computeType
    ? getManagerStudentCourseGradeTypeLabel(model.course.computeType)
    : "Pending";
}

function getFinalExamLabel(model: StudentClassGradeSheetModel): string {
  return model.mainFactors.finalExam.title
    ? `Final exam (${model.mainFactors.finalExam.title})`
    : "Final exam";
}

function getAttendanceLabel(model: StudentClassGradeSheetModel): string {
  return `${model.attendance.presentCount} / ${model.attendance.totalSessions} session${model.attendance.totalSessions === 1 ? "" : "s"}`;
}

function buildHorizontalDocInfoRows(model: StudentClassGradeSheetModel): string {
  const computeStatus = getSheetComputeStatus(model);

  return [
    [
      tableCell("Class", { header: true }),
      tableCell(model.course.className),
      tableCell("Subject", { header: true }),
      tableCell(model.course.subjectName),
    ],
    [
      tableCell("Semester", { header: true }),
      tableCell(model.course.semesterName),
      tableCell("Enrollment", { header: true }),
      tableCell(model.course.enrollmentStatus),
    ],
    [
      tableCell("Joined", { header: true }),
      tableCell(format(new Date(model.course.joinedAt), "MMM d, yyyy")),
      tableCell("Compute status", { header: true }),
      tableCell(computeStatus),
    ],
    [
      tableCell("Attendance", { header: true }),
      tableCell(getAttendanceLabel(model), { colspan: 3, bold: true }),
    ],
  ]
    .map((cells) => `<tr>${cells.join("")}</tr>`)
    .join("");
}

function buildVerticalDocInfoRows(model: StudentClassGradeSheetModel): string {
  const computeStatus = getSheetComputeStatus(model);

  return [
    [tableCell("Class", { header: true }), tableCell(model.course.className)],
    [tableCell("Subject", { header: true }), tableCell(model.course.subjectName)],
    [tableCell("Semester", { header: true }), tableCell(model.course.semesterName)],
    [
      tableCell("Enrollment", { header: true }),
      tableCell(model.course.enrollmentStatus),
    ],
    [
      tableCell("Joined", { header: true }),
      tableCell(format(new Date(model.course.joinedAt), "MMM d, yyyy")),
    ],
    [tableCell("Compute status", { header: true }), tableCell(computeStatus)],
    [
      tableCell("Attendance", { header: true }),
      tableCell(getAttendanceLabel(model), { bold: true }),
    ],
  ]
    .map((cells) => `<tr>${cells.join("")}</tr>`)
    .join("");
}

function buildHorizontalDocGroupSection(
  model: StudentClassGradeSheetModel
): string {
  if (model.groupGradeSlots.length === 0) {
    return "";
  }

  return `<table style="width:100%;border-collapse:collapse;border:1px solid #64748b;margin-top:12px;">
          <tr>${tableCell("Group grades by session", { header: true, colspan: model.groupGradeSlots.length })}</tr>
          <tr>${model.groupGradeSlots.map((slot) => tableCell(slot.sessionLabel, { header: true, align: "center" })).join("")}</tr>
          <tr>${model.groupGradeSlots.map((slot) => tableCell(slot.gradeLabel, { align: "center", bold: true })).join("")}</tr>
        </table>`;
}

function buildVerticalDocGroupSection(
  model: StudentClassGradeSheetModel
): string {
  if (model.groupGradeSlots.length === 0) {
    return "";
  }

  const rows = model.groupGradeSlots
    .map(
      (slot) =>
        `<tr>${tableCell(slot.sessionLabel, { header: true })}${tableCell(slot.gradeLabel, { align: "center", bold: true })}</tr>`
    )
    .join("");

  return `<table style="width:100%;border-collapse:collapse;border:1px solid #64748b;margin-top:12px;">
          <tr>${tableCell("Group grades by session", { header: true, colspan: 2 })}</tr>
          <tr>${tableCell("Session", { header: true })}${tableCell("Grade", { header: true, align: "center" })}</tr>
          ${rows}
        </table>`;
}

function buildDocTaskRows(model: StudentClassGradeSheetModel): string {
  if (model.taskRows.length === 0) {
    return `<tr>${tableCell("No tasks recorded for this class.", { colspan: 6, align: "center" })}</tr>`;
  }

  return model.taskRows
    .map(
      (task, index) =>
        `<tr>
              ${tableCell(String(index + 1), { align: "center" })}
              ${tableCell(task.title)}
              ${tableCell(task.sessionLabel ?? "—", { align: "center" })}
              ${tableCell(task.grade == null ? "—" : String(task.grade), { align: "center", bold: true })}
              ${tableCell(String(task.maxGrade), { align: "center" })}
              ${tableCell(task.status.replaceAll("_", " "), { align: "center" })}
            </tr>`
    )
    .join("");
}

export function buildStudentGradeSheetDocHtml(
  model: StudentClassGradeSheetModel,
  totalLabel: string,
  orientation: StudentGradeSheetOrientation = "horizontal"
): string {
  const isVertical = isVerticalGradeSheetOrientation(orientation);
  const infoRows = isVertical
    ? buildVerticalDocInfoRows(model)
    : buildHorizontalDocInfoRows(model);
  const groupSection = isVertical
    ? buildVerticalDocGroupSection(model)
    : buildHorizontalDocGroupSection(model);
  const taskRows = buildDocTaskRows(model);
  const finalExamLabel = getFinalExamLabel(model);

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:w="urn:schemas-microsoft-com:office:word"
  xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${escapeHtml(model.studentName)} — Grade sheet</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page { ${getDocPageSizeCss(orientation)} }
  body { font-family: Calibri, Arial, sans-serif; color: #0f172a; }
  h1 { margin: 0; font-size: 22px; }
  p { margin: 4px 0; }
</style>
</head>
<body>
  <div style="border:2px solid #64748b;background:#f8fafc;padding:16px;text-align:center;">
    <p style="font-size:10px;font-weight:600;letter-spacing:0.25em;text-transform:uppercase;color:#475569;">Official grade certificate</p>
    <h1>${escapeHtml(model.studentName)}</h1>
    <p style="font-size:10px;color:#64748b;">Issued ${escapeHtml(format(new Date(model.generatedAt), "MMMM d, yyyy"))}</p>
  </div>

  <table style="width:100%;border-collapse:collapse;border:1px solid #64748b;margin-top:12px;">
    <tbody>${infoRows}</tbody>
  </table>

  ${groupSection}

  <table style="width:100%;border-collapse:collapse;border:1px solid #64748b;margin-top:12px;">
    <thead>
      <tr>
        ${tableCell("#", { header: true, align: "center" })}
        ${tableCell("Task", { header: true })}
        ${tableCell("Session", { header: true, align: "center" })}
        ${tableCell("Grade", { header: true, align: "center" })}
        ${tableCell("Max", { header: true, align: "center" })}
        ${tableCell("Status", { header: true, align: "center" })}
      </tr>
    </thead>
    <tbody>${taskRows}</tbody>
  </table>

  <table style="width:100%;border-collapse:collapse;border:1px solid #64748b;margin-top:12px;">
    <thead>
      <tr>
        ${tableCell("Component", { header: true })}
        ${tableCell("Weight", { header: true, align: "center" })}
        ${tableCell("Grade", { header: true, align: "center" })}
        ${tableCell("Contribution", { header: true, align: "center" })}
      </tr>
    </thead>
    <tbody>
      <tr>
        ${tableCell("Tasks (average)")}
        ${tableCell(formatCourseGradeWeight(model.mainFactors.tasks.weight), { align: "center" })}
        ${tableCell(formatCourseGradeValue(model.mainFactors.tasks.grade), { align: "center", bold: true })}
        ${tableCell(model.mainFactors.tasks.contribution == null ? "—" : `${model.mainFactors.tasks.contribution.toFixed(1)} pts`, { align: "center" })}
      </tr>
      <tr>
        ${tableCell(finalExamLabel)}
        ${tableCell(formatCourseGradeWeight(model.mainFactors.finalExam.weight), { align: "center" })}
        ${tableCell(formatCourseGradeValue(model.mainFactors.finalExam.grade), { align: "center", bold: true })}
        ${tableCell(model.mainFactors.finalExam.contribution == null ? "—" : `${model.mainFactors.finalExam.contribution.toFixed(1)} pts`, { align: "center" })}
      </tr>
      <tr style="background:#f1f5f9;">
        ${tableCell("Course total", { bold: true, colspan: 2 })}
        ${tableCell(totalLabel, { align: "center", bold: true, colspan: 2 })}
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}

function drawPdfHeader(doc: GradeSheetPdfDocument, model: StudentClassGradeSheetModel) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("OFFICIAL GRADE CERTIFICATE", pageWidth / 2, 14, { align: "center" });

  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(model.studentName, pageWidth / 2, 22, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Issued ${format(new Date(model.generatedAt), "MMMM d, yyyy")}`,
    pageWidth / 2,
    28,
    { align: "center" }
  );
}

function getNextPdfStartY(doc: GradeSheetPdfDocument, fallback: number): number {
  return (doc.lastAutoTable?.finalY ?? fallback) + 4;
}

function buildHorizontalPdfInfoBody(model: StudentClassGradeSheetModel) {
  return [
    ["Class", model.course.className, "Subject", model.course.subjectName],
    [
      "Semester",
      model.course.semesterName,
      "Enrollment",
      model.course.enrollmentStatus,
    ],
    [
      "Joined",
      format(new Date(model.course.joinedAt), "MMM d, yyyy"),
      "Compute status",
      getSheetComputeStatus(model),
    ],
    [
      "Attendance",
      {
        content: getAttendanceLabel(model),
        colSpan: 3,
        styles: { fontStyle: "bold" },
      },
    ],
  ];
}

function buildVerticalPdfInfoBody(model: StudentClassGradeSheetModel) {
  return [
    ["Class", model.course.className],
    ["Subject", model.course.subjectName],
    ["Semester", model.course.semesterName],
    ["Enrollment", model.course.enrollmentStatus],
    ["Joined", format(new Date(model.course.joinedAt), "MMM d, yyyy")],
    ["Compute status", getSheetComputeStatus(model)],
    [
      "Attendance",
      { content: getAttendanceLabel(model), styles: { fontStyle: "bold" } },
    ],
  ];
}

function appendPdfGroupTables(
  doc: GradeSheetPdfDocument,
  model: StudentClassGradeSheetModel,
  orientation: StudentGradeSheetOrientation,
  startY: number
): number {
  if (model.groupGradeSlots.length === 0) {
    return startY;
  }

  if (isVerticalGradeSheetOrientation(orientation)) {
    autoTable(doc, {
      startY,
      theme: "grid",
      styles: PDF_TABLE_STYLES,
      headStyles: PDF_HEAD_STYLES,
      head: [["Session", "Grade"]],
      body: model.groupGradeSlots.map((slot) => [
        slot.sessionLabel,
        slot.gradeLabel,
      ]),
      columnStyles: {
        1: { halign: "center", fontStyle: "bold" },
      },
    });
  } else {
    autoTable(doc, {
      startY,
      theme: "grid",
      styles: PDF_TABLE_STYLES,
      headStyles: PDF_HEAD_STYLES,
      head: [model.groupGradeSlots.map((slot) => slot.sessionLabel)],
      body: [model.groupGradeSlots.map((slot) => slot.gradeLabel)],
    });
  }

  return getNextPdfStartY(doc, startY);
}

function appendPdfSummaryTable(
  doc: GradeSheetPdfDocument,
  model: StudentClassGradeSheetModel,
  totalLabel: string,
  startY: number
): void {
  autoTable(doc, {
    startY,
    theme: "grid",
    styles: PDF_TABLE_STYLES,
    headStyles: PDF_HEAD_STYLES,
    head: [["Component", "Weight", "Grade", "Contribution"]],
    body: [
      [
        "Tasks (average)",
        formatCourseGradeWeight(model.mainFactors.tasks.weight),
        formatCourseGradeValue(model.mainFactors.tasks.grade),
        model.mainFactors.tasks.contribution == null
          ? "—"
          : `${model.mainFactors.tasks.contribution.toFixed(1)} pts`,
      ],
      [
        getFinalExamLabel(model),
        formatCourseGradeWeight(model.mainFactors.finalExam.weight),
        formatCourseGradeValue(model.mainFactors.finalExam.grade),
        model.mainFactors.finalExam.contribution == null
          ? "—"
          : `${model.mainFactors.finalExam.contribution.toFixed(1)} pts`,
      ],
      [
        {
          content: "Course total",
          colSpan: 2,
          styles: { fontStyle: "bold", fillColor: [241, 245, 249] },
        },
        {
          content: totalLabel,
          colSpan: 2,
          styles: {
            fontStyle: "bold",
            halign: "center",
            fillColor: [241, 245, 249],
          },
        },
      ],
    ],
    columnStyles: {
      1: { halign: "center" },
      2: { halign: "center", fontStyle: "bold" },
      3: { halign: "center" },
    },
  });
}

export function downloadStudentGradeSheetPdf(
  model: StudentClassGradeSheetModel,
  totalLabel: string,
  orientation: StudentGradeSheetOrientation = "horizontal"
): void {
  const doc = new jsPDF({
    orientation: getJsPdfOrientation(orientation),
    unit: "mm",
    format: "a4",
  }) as GradeSheetPdfDocument;

  drawPdfHeader(doc, model);

  const infoBody = isVerticalGradeSheetOrientation(orientation)
    ? buildVerticalPdfInfoBody(model)
    : buildHorizontalPdfInfoBody(model);

  autoTable(doc, {
    startY: 33,
    theme: "grid",
    styles: PDF_TABLE_STYLES,
    headStyles: PDF_HEAD_STYLES,
    body: infoBody,
    columnStyles: isVerticalGradeSheetOrientation(orientation)
      ? { 0: PDF_LABEL_COLUMN_STYLES }
      : {
          0: PDF_LABEL_COLUMN_STYLES,
          2: PDF_LABEL_COLUMN_STYLES,
        },
  });

  let startY = getNextPdfStartY(doc, 33);
  startY = appendPdfGroupTables(doc, model, orientation, startY);

  autoTable(doc, {
    startY,
    theme: "grid",
    styles: PDF_TABLE_STYLES,
    headStyles: PDF_HEAD_STYLES,
    head: [["#", "Task", "Session", "Grade", "Max", "Status"]],
    body:
      model.taskRows.length === 0
        ? [["", "No tasks recorded for this class.", "", "", "", ""]]
        : model.taskRows.map((task, index) => [
            String(index + 1),
            task.title,
            task.sessionLabel ?? "—",
            task.grade == null ? "—" : String(task.grade),
            String(task.maxGrade),
            task.status.replaceAll("_", " "),
          ]),
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      2: { halign: "center" },
      3: { halign: "center", fontStyle: "bold" },
      4: { halign: "center" },
      5: { halign: "center" },
    },
  });

  startY = getNextPdfStartY(doc, startY);
  appendPdfSummaryTable(doc, model, totalLabel, startY);

  doc.save(getStudentGradeSheetFilename(model.studentName, "pdf"));
}

export function downloadStudentGradeSheetDoc(
  model: StudentClassGradeSheetModel,
  totalLabel: string,
  orientation: StudentGradeSheetOrientation = "horizontal"
): void {
  const html = buildStudentGradeSheetDocHtml(model, totalLabel, orientation);
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });

  downloadBlob({
    blob,
    filename: getStudentGradeSheetFilename(model.studentName, "doc"),
  });
}
