"use client";

import { format } from "date-fns";
import {
  ChevronDownIcon,
  FileTextIcon,
  LockIcon,
  PrinterIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { Can } from "@/components/auth/can";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  formatCourseGradeValue,
  formatCourseGradeWeight,
  getManagerStudentCourseGradeTypeLabel,
} from "@/lib/constants/manager-student-course-grade-display";
import {
  downloadStudentGradeSheetDoc,
  downloadStudentGradeSheetPdf,
} from "@/lib/export/student-grade-sheet-export";
import {
  getGradeSheetAspectClass,
  getGradeSheetMaxWidthClass,
  isVerticalGradeSheetOrientation,
  type StudentGradeSheetOrientation,
} from "@/lib/export/student-grade-sheet-orientation";
import { printPageSection } from "@/lib/export/print-page-section";
import type { StudentClassGradeSheetModel } from "@/lib/manager/student-class-grade-sheet";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type StudentClassGradeSheetDemoProps = {
  model: StudentClassGradeSheetModel;
  isLocked: boolean;
};

const certCell =
  "border border-slate-400 px-2 py-1.5 text-[11px] align-middle";
const certHeadCell =
  "border border-slate-400 bg-slate-100 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700";
const certCellCompact =
  "border border-slate-400 px-1.5 py-1 text-[10px] align-middle";
const certHeadCellCompact =
  "border border-slate-400 bg-slate-100 px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-700";

function CertTable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <table
      className={cn(
        "w-full border-collapse border border-slate-400 text-slate-900",
        className
      )}
    >
      {children}
    </table>
  );
}

function GradeSheetLockedState() {
  return (
    <div className="p-5">
      <div className="mx-auto flex min-h-48 max-w-lg flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <LockIcon className="size-5" aria-hidden />
        </div>
        <p className="mt-4 text-sm font-medium">Grade sheet locked</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Compute this student&apos;s course grade to unlock the certificate
          preview, print, and export options.
        </p>
      </div>
    </div>
  );
}

function OrientationToggle({
  orientation,
  onChange,
  disabled,
}: {
  orientation: StudentGradeSheetOrientation;
  onChange: (orientation: StudentGradeSheetOrientation) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="inline-flex rounded-md border bg-background p-0.5"
      role="group"
      aria-label="Sheet orientation"
    >
      <Button
        type="button"
        variant={orientation === "horizontal" ? "secondary" : "ghost"}
        size="sm"
        disabled={disabled}
        className="h-8 px-3"
        onClick={() => onChange("horizontal")}
      >
        Horizontal
      </Button>
      <Button
        type="button"
        variant={orientation === "vertical" ? "secondary" : "ghost"}
        size="sm"
        disabled={disabled}
        className="h-8 px-3"
        onClick={() => onChange("vertical")}
      >
        Vertical
      </Button>
    </div>
  );
}

export function StudentClassGradeSheetDemo({
  model,
  isLocked,
}: StudentClassGradeSheetDemoProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] =
    useState<StudentGradeSheetOrientation>("horizontal");
  const [isPrinting, setIsPrinting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "doc" | null>(
    null
  );

  const totalLabel = model.course.isComputed
    ? formatCourseGradeValue(model.course.totalGrade)
    : model.mainFactors.previewTotal == null
      ? "Not computed"
      : `${formatCourseGradeValue(model.mainFactors.previewTotal)} (preview)`;

  function handlePrint() {
    printPageSection({
      onStart: () => setIsPrinting(true),
      onEnd: () => setIsPrinting(false),
    });
  }

  function handleExportPdf() {
    setExportingFormat("pdf");

    try {
      downloadStudentGradeSheetPdf(model, totalLabel, orientation);
      showSuccessToast("Grade sheet exported as PDF.");
    } catch {
      showErrorToast("Unable to export grade sheet as PDF.");
    } finally {
      setExportingFormat(null);
    }
  }

  function handleExportDoc() {
    setExportingFormat("doc");

    try {
      downloadStudentGradeSheetDoc(model, totalLabel, orientation);
      showSuccessToast("Grade sheet exported as Word document.");
    } catch {
      showErrorToast("Unable to export grade sheet as Word document.");
    } finally {
      setExportingFormat(null);
    }
  }

  if (isLocked) {
    return (
      <ClassTabCollapsibleSection
        title="Grade sheet preview"
        description="Available after this student's grade is computed."
        defaultOpen={false}
      >
        <GradeSheetLockedState />
      </ClassTabCollapsibleSection>
    );
  }

  const isBusy = isPrinting || exportingFormat !== null;

  return (
    <ClassTabCollapsibleSection
      title="Grade sheet preview"
      description="Official A4 grade certificate — horizontal or vertical layout."
      defaultOpen
    >
      <div className="space-y-4 p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Preview the official grade certificate before printing or exporting.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <OrientationToggle
              orientation={orientation}
              onChange={setOrientation}
              disabled={isBusy}
            />

            <Can permission={PERMISSIONS.GRADES_EXPORT_CERTIFICATES}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exportingFormat !== null}
                  >
                    {exportingFormat ? (
                      <InlineSpinner />
                    ) : (
                      <FileTextIcon data-icon="inline-start" />
                    )}
                    Export
                    <ChevronDownIcon data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Export grade sheet</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    disabled={exportingFormat !== null}
                    onSelect={handleExportPdf}
                  >
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    disabled={exportingFormat !== null}
                    onSelect={handleExportDoc}
                  >
                    Export as DOC
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </Can>

            <Can permission={PERMISSIONS.GRADES_PREVIEW_CERTIFICATE}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={handlePrint}
              >
                <PrinterIcon data-icon="inline-start" />
                Print sheet
              </Button>
            </Can>
          </div>
        </div>

        <StudentGradeSheetCanvas
          containerRef={sheetRef}
          model={model}
          totalLabel={totalLabel}
          orientation={orientation}
        />
      </div>

      <div className="hidden p-5 print:block">
        <StudentGradeSheetCanvas
          model={model}
          totalLabel={totalLabel}
          orientation={orientation}
        />
      </div>
    </ClassTabCollapsibleSection>
  );
}

function SheetHeader({
  model,
  isVertical,
}: {
  model: StudentClassGradeSheetModel;
  isVertical: boolean;
}) {
  return (
    <div className="shrink-0 border-2 border-slate-400 bg-slate-50 px-4 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-600">
        Official grade certificate
      </p>
      <h3
        className={cn(
          "mt-1 font-bold tracking-tight",
          isVertical ? "text-lg" : "text-xl"
        )}
      >
        {model.studentName}
      </h3>
      <p className="mt-1 text-[10px] text-slate-500">
        Issued {format(new Date(model.generatedAt), "MMMM d, yyyy")}
      </p>
    </div>
  );
}

function HorizontalInfoTable({ model }: { model: StudentClassGradeSheetModel }) {
  return (
    <CertTable className="mt-3">
      <tbody>
        <tr>
          <td className={cn(certHeadCell, "w-[28%]")}>Class</td>
          <td className={certCell}>{model.course.className}</td>
          <td className={cn(certHeadCell, "w-[22%]")}>Subject</td>
          <td className={certCell}>{model.course.subjectName}</td>
        </tr>
        <tr>
          <td className={certHeadCell}>Semester</td>
          <td className={certCell}>{model.course.semesterName}</td>
          <td className={certHeadCell}>Enrollment</td>
          <td className={certCell}>{model.course.enrollmentStatus}</td>
        </tr>
        <tr>
          <td className={certHeadCell}>Joined</td>
          <td className={certCell}>
            {format(new Date(model.course.joinedAt), "MMM d, yyyy")}
          </td>
          <td className={certHeadCell}>Compute status</td>
          <td className={certCell}>
            {model.course.computeType
              ? getManagerStudentCourseGradeTypeLabel(model.course.computeType)
              : "Pending"}
          </td>
        </tr>
        <tr>
          <td className={certHeadCell}>Attendance</td>
          <td className={cn(certCell, "font-semibold tabular-nums")} colSpan={3}>
            {model.attendance.presentCount} / {model.attendance.totalSessions}{" "}
            session
            {model.attendance.totalSessions === 1 ? "" : "s"}
          </td>
        </tr>
      </tbody>
    </CertTable>
  );
}

function VerticalInfoTable({ model }: { model: StudentClassGradeSheetModel }) {
  const rows = [
    ["Class", model.course.className],
    ["Subject", model.course.subjectName],
    ["Semester", model.course.semesterName],
    ["Enrollment", model.course.enrollmentStatus],
    ["Joined", format(new Date(model.course.joinedAt), "MMM d, yyyy")],
    [
      "Compute status",
      model.course.computeType
        ? getManagerStudentCourseGradeTypeLabel(model.course.computeType)
        : "Pending",
    ],
    [
      "Attendance",
      `${model.attendance.presentCount} / ${model.attendance.totalSessions} session${model.attendance.totalSessions === 1 ? "" : "s"}`,
    ],
  ] as const;

  return (
    <CertTable className="mt-3">
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td className={cn(certHeadCellCompact, "w-[38%]")}>{label}</td>
            <td
              className={cn(
                certCellCompact,
                label === "Attendance" && "font-semibold tabular-nums"
              )}
            >
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </CertTable>
  );
}

function HorizontalGroupGradesTable({
  model,
}: {
  model: StudentClassGradeSheetModel;
}) {
  if (model.groupGradeSlots.length === 0) {
    return null;
  }

  return (
    <CertTable className="mt-3">
      <thead>
        <tr>
          <th
            className={cn(certHeadCell, "text-left")}
            colSpan={model.groupGradeSlots.length}
          >
            Group grades by session
          </th>
        </tr>
        <tr>
          {model.groupGradeSlots.map((slot, index) => (
            <th
              key={`${slot.sessionLabel}-${index}`}
              className={cn(certHeadCell, "text-center")}
            >
              {slot.sessionLabel}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          {model.groupGradeSlots.map((slot, index) => (
            <td
              key={`${slot.sessionLabel}-grade-${index}`}
              className={cn(certCell, "text-center font-medium tabular-nums")}
            >
              {slot.gradeLabel}
            </td>
          ))}
        </tr>
      </tbody>
    </CertTable>
  );
}

function VerticalGroupGradesTable({
  model,
}: {
  model: StudentClassGradeSheetModel;
}) {
  if (model.groupGradeSlots.length === 0) {
    return null;
  }

  return (
    <CertTable className="mt-3">
      <thead>
        <tr>
          <th className={cn(certHeadCellCompact, "text-left")} colSpan={2}>
            Group grades by session
          </th>
        </tr>
        <tr>
          <th className={certHeadCellCompact}>Session</th>
          <th className={cn(certHeadCellCompact, "text-center")}>Grade</th>
        </tr>
      </thead>
      <tbody>
        {model.groupGradeSlots.map((slot, index) => (
          <tr key={`${slot.sessionLabel}-${index}`}>
            <td className={certCellCompact}>{slot.sessionLabel}</td>
            <td
              className={cn(
                certCellCompact,
                "text-center font-medium tabular-nums"
              )}
            >
              {slot.gradeLabel}
            </td>
          </tr>
        ))}
      </tbody>
    </CertTable>
  );
}

function TasksTable({
  model,
  isVertical,
}: {
  model: StudentClassGradeSheetModel;
  isVertical: boolean;
}) {
  const headCell = isVertical ? certHeadCellCompact : certHeadCell;
  const bodyCell = isVertical ? certCellCompact : certCell;

  return (
    <CertTable className="mt-3">
      <thead>
        <tr>
          <th className={cn(headCell, "w-8 text-center")}>#</th>
          <th className={cn(headCell, "text-left")}>Task</th>
          <th className={cn(headCell, "w-[14%] text-center")}>Session</th>
          <th className={cn(headCell, "w-[12%] text-center")}>Grade</th>
          <th className={cn(headCell, "w-[10%] text-center")}>Max</th>
          <th className={cn(headCell, "w-[14%] text-center")}>Status</th>
        </tr>
      </thead>
      <tbody>
        {model.taskRows.length === 0 ? (
          <tr>
            <td className={cn(bodyCell, "text-center text-slate-500")} colSpan={6}>
              No tasks recorded for this class.
            </td>
          </tr>
        ) : (
          model.taskRows.map((task, index) => (
            <tr key={`${task.title}-${index}`}>
              <td className={cn(bodyCell, "text-center tabular-nums")}>
                {index + 1}
              </td>
              <td className={bodyCell}>{task.title}</td>
              <td className={cn(bodyCell, "text-center")}>
                {task.sessionLabel ?? "—"}
              </td>
              <td className={cn(bodyCell, "text-center font-medium tabular-nums")}>
                {task.grade == null ? "—" : task.grade}
              </td>
              <td className={cn(bodyCell, "text-center tabular-nums")}>
                {task.maxGrade}
              </td>
              <td className={cn(bodyCell, "text-center capitalize")}>
                {task.status.replaceAll("_", " ")}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </CertTable>
  );
}

function SummaryTable({
  model,
  totalLabel,
  isVertical,
}: {
  model: StudentClassGradeSheetModel;
  totalLabel: string;
  isVertical: boolean;
}) {
  const headCell = isVertical ? certHeadCellCompact : certHeadCell;
  const bodyCell = isVertical ? certCellCompact : certCell;

  return (
    <CertTable className="mt-3">
      <thead>
        <tr>
          <th className={cn(headCell, "text-left")}>Component</th>
          <th className={cn(headCell, "w-[14%] text-center")}>Weight</th>
          <th className={cn(headCell, "w-[14%] text-center")}>Grade</th>
          <th className={cn(headCell, "w-[16%] text-center")}>Contribution</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className={bodyCell}>
            <span className="font-medium">Tasks (average)</span>
          </td>
          <td className={cn(bodyCell, "text-center tabular-nums")}>
            {formatCourseGradeWeight(model.mainFactors.tasks.weight)}
          </td>
          <td className={cn(bodyCell, "text-center font-medium tabular-nums")}>
            {formatCourseGradeValue(model.mainFactors.tasks.grade)}
          </td>
          <td className={cn(bodyCell, "text-center tabular-nums")}>
            {model.mainFactors.tasks.contribution == null
              ? "—"
              : `${model.mainFactors.tasks.contribution.toFixed(1)} pts`}
          </td>
        </tr>
        <tr>
          <td className={bodyCell}>
            <span className="font-medium">Final exam</span>
            {model.mainFactors.finalExam.title ? (
              <span className="ml-1 text-[10px] text-slate-500">
                ({model.mainFactors.finalExam.title})
              </span>
            ) : null}
          </td>
          <td className={cn(bodyCell, "text-center tabular-nums")}>
            {formatCourseGradeWeight(model.mainFactors.finalExam.weight)}
          </td>
          <td className={cn(bodyCell, "text-center font-medium tabular-nums")}>
            {formatCourseGradeValue(model.mainFactors.finalExam.grade)}
          </td>
          <td className={cn(bodyCell, "text-center tabular-nums")}>
            {model.mainFactors.finalExam.contribution == null
              ? "—"
              : `${model.mainFactors.finalExam.contribution.toFixed(1)} pts`}
          </td>
        </tr>
        <tr className="bg-slate-100">
          <td className={cn(bodyCell, "font-bold uppercase")} colSpan={2}>
            Course total
          </td>
          <td
            className={cn(
              bodyCell,
              "text-center font-bold tabular-nums",
              isVertical ? "text-sm" : "text-base"
            )}
            colSpan={2}
          >
            {totalLabel}
          </td>
        </tr>
      </tbody>
    </CertTable>
  );
}

function StudentGradeSheetCanvas({
  containerRef,
  model,
  totalLabel,
  orientation,
}: {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  model: StudentClassGradeSheetModel;
  totalLabel: string;
  orientation: StudentGradeSheetOrientation;
}) {
  const isVertical = isVerticalGradeSheetOrientation(orientation);

  return (
    <div
      ref={containerRef}
      id="student-grade-sheet-print"
      data-print-root="student-grade-sheet"
      data-sheet-orientation={orientation}
      className={cn(
        "student-grade-sheet mx-auto w-full overflow-hidden rounded-lg border-2 border-slate-400 bg-white text-slate-900 shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none",
        getGradeSheetMaxWidthClass(orientation)
      )}
    >
      <div
        className={cn(
          getGradeSheetAspectClass(orientation),
          "flex min-h-0 flex-col p-4 sm:p-5",
          isVertical && "overflow-hidden"
        )}
      >
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            isVertical && "overflow-y-auto"
          )}
        >
          <SheetHeader model={model} isVertical={isVertical} />

          {isVertical ? (
            <VerticalInfoTable model={model} />
          ) : (
            <HorizontalInfoTable model={model} />
          )}

          {isVertical ? (
            <VerticalGroupGradesTable model={model} />
          ) : (
            <HorizontalGroupGradesTable model={model} />
          )}

          <TasksTable model={model} isVertical={isVertical} />
          <SummaryTable
            model={model}
            totalLabel={totalLabel}
            isVertical={isVertical}
          />
        </div>
      </div>
    </div>
  );
}
