"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  DownloadIcon,
  EyeIcon,
  MessageSquareTextIcon,
  UsersIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { ClassFastCertificatePanel } from "@/components/manager/classes/class-fast-certificate-panel";
import { CustomizeComputeAllDialog } from "@/components/manager/classes/customize-compute-all-dialog";
import {
  ComputeFactorWeightsFields,
  type ComputeFactorWeightsValues,
} from "@/components/manager/classes/compute-factor-weights-fields";
import { StudentGradeMissingDataDialog } from "@/components/manager/classes/student-grade-missing-data-dialog";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PERMISSIONS } from "@/lib/constants/permissions";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildDefaultTaskWeights,
  getComputeFactorWeightFormDefaults,
  parseWeight,
  type FactorWeightsValues,
  validateFactorWeights,
} from "@/lib/compute/custom-compute-form-utils";
import { DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS } from "@/lib/constants/manager-class-grade-defaults";
import { getManagerClassStudentGradesDetailRoute } from "@/lib/constants/routes";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type {
  ManagerClassFinalExamRow,
  ManagerStudentFinalExamGradeRow,
} from "@/types/manager-class-final-exam";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import {
  computeAllStudentGradesAction,
  computeStudentGradeAction,
  deleteComputedGradeAction,
  fetchComputedGradeSheetBundlesAction,
} from "@/app/manager/classes/grades/actions";

type ClassStudentGradesSectionProps = {
  classId: string;
  classRow: ManagerClassRow;
  rows: ManagerClassStudentGradeRow[];
  classTasks: ManagerClassTaskForGradesRow[];
  finalExam: ManagerClassFinalExamRow | null;
  finalExamStudentGrades: ManagerStudentFinalExamGradeRow[];
};

type ComputeBatch = {
  id: string;
  label: string;
  factorWeights: FactorWeightsValues;
  taskWeights: Record<string, string>;
};

function formatGrade(value: number | null) {
  return value === null ? "—" : value.toFixed(1);
}

function formatWeight(value: number) {
  return `${value}%`;
}

function buildBatchSignature(
  factorWeights: FactorWeightsValues,
  taskWeights: Record<string, string>
) {
  const sortedTaskWeights = Object.entries(taskWeights).sort(([left], [right]) =>
    left.localeCompare(right)
  );

  return JSON.stringify({
    factorWeights,
    taskWeights: sortedTaskWeights,
  });
}

function buildBatchLabel(label: string, factorWeights: FactorWeightsValues) {
  return `${label} · T ${formatWeight(
    factorWeights.tasks_weight
  )} · F ${formatWeight(factorWeights.final_exam_weight)}`;
}

function StudentGradeNameLink({
  classId,
  studentProfileId,
  fullName,
}: {
  classId: string;
  studentProfileId: string;
  fullName: string;
}) {
  return (
    <Link
      href={getManagerClassStudentGradesDetailRoute(classId, studentProfileId)}
      className="font-medium text-foreground underline-offset-4 hover:underline"
    >
      {fullName}
    </Link>
  );
}

function buildRowComputeBatch(
  row: ManagerClassStudentGradeRow,
  defaultFactorWeights: FactorWeightsValues,
  defaultTaskWeights: Record<string, string>
): ComputeBatch {
  const factorWeights: FactorWeightsValues = {
    group_weight: 0,
    attendee_weight: 0,
    tasks_weight:
      row.stored_tasks_weight ?? defaultFactorWeights.tasks_weight,
    final_exam_weight:
      row.stored_final_exam_weight ?? defaultFactorWeights.final_exam_weight,
  };
  const taskWeights = row.stored_task_weights
    ? Object.fromEntries(
        Object.entries(row.stored_task_weights).map(([key, value]) => [
          key,
          String(value),
        ])
      )
    : defaultTaskWeights;

  return {
    id: buildBatchSignature(factorWeights, taskWeights),
    label: buildBatchLabel(
      row.compute_type === "custom" ? "Customized weights" : "Default weights",
      factorWeights
    ),
    factorWeights,
    taskWeights,
  };
}

function clearComputedGradeFields(
  row: ManagerClassStudentGradeRow
): ManagerClassStudentGradeRow {
  return {
    ...row,
    is_computed: false,
    total_grade: null,
    task_total_grade: null,
    final_exam_grade: null,
    course_grade_id: null,
    compute_type: null,
    stored_tasks_weight: null,
    stored_final_exam_weight: null,
    stored_task_weights: null,
  };
}

function mergeGradeRow(
  rows: ManagerClassStudentGradeRow[],
  updated: ManagerClassStudentGradeRow
) {
  return rows.map((row) => (row.user_id === updated.user_id ? updated : row));
}

export function ClassStudentGradesSection({
  classId,
  classRow,
  rows: initialRows,
  classTasks,
  finalExam,
  finalExamStudentGrades,
}: ClassStudentGradesSectionProps) {
  const [gradeRows, setGradeRows] = useState(initialRows);
  const [prevRows, setPrevRows] = useState(initialRows);

  if (initialRows !== prevRows) {
    setPrevRows(initialRows);
    setGradeRows(initialRows);
  }

  const defaultFactorWeights = DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS;
  const defaultTaskWeights = useMemo(
    () => buildDefaultTaskWeights(classTasks),
    [classTasks]
  );
  const finalExamGradeByUserId = useMemo(
    () => new Map(finalExamStudentGrades.map((row) => [row.student_id, row])),
    [finalExamStudentGrades]
  );

  const unreadyRows = useMemo(
    () =>
      gradeRows.filter(
        (row) => !row.is_computed && row.missing_items.length > 0
      ),
    [gradeRows]
  );
  const pendingRows = useMemo(
    () =>
      gradeRows.filter(
        (row) => !row.is_computed && row.missing_items.length === 0
      ),
    [gradeRows]
  );
  const computedRows = useMemo(
    () => gradeRows.filter((row) => row.is_computed),
    [gradeRows]
  );
  const groupedComputedRows = useMemo(() => {
    const groups = new Map<
      string,
      {
        batch: ComputeBatch;
        rows: ManagerClassStudentGradeRow[];
      }
    >();

    for (const row of computedRows) {
      const batch = buildRowComputeBatch(
        row,
        defaultFactorWeights,
        defaultTaskWeights
      );
      const existing = groups.get(batch.id);

      if (existing) {
        existing.rows.push(row);
      } else {
        groups.set(batch.id, { batch, rows: [row] });
      }
    }

    return Array.from(groups.values());
  }, [computedRows, defaultFactorWeights, defaultTaskWeights]);
  const [selectedRow, setSelectedRow] = useState<ManagerClassStudentGradeRow | null>(
    null
  );
  const [rowToDelete, setRowToDelete] =
    useState<ManagerClassStudentGradeRow | null>(null);
  const [isComputeOpen, setIsComputeOpen] = useState(false);
  const [isComputeAllOpen, setIsComputeAllOpen] = useState(false);
  const [isCustomizeComputeAllOpen, setIsCustomizeComputeAllOpen] = useState(false);
  const [isDeleteGradeOpen, setIsDeleteGradeOpen] = useState(false);
  const [selectedMissingRow, setSelectedMissingRow] =
    useState<ManagerClassStudentGradeRow | null>(null);
  const [isMissingDataOpen, setIsMissingDataOpen] = useState(false);
  const [computeWeights, setComputeWeights] = useState<ComputeFactorWeightsValues>(
    () =>
      getComputeFactorWeightFormDefaults({
        default_tasks_weight: DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.tasks_weight,
        default_final_exam_weight:
          DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS.final_exam_weight,
      })
  );
  const [computeWeightError, setComputeWeightError] = useState<string | null>(null);
  const [isStudentComputePending, setIsStudentComputePending] = useState(false);
  const [isComputeAllPending, setIsComputeAllPending] = useState(false);
  const [isCustomizeComputeAllPending, setIsCustomizeComputeAllPending] =
    useState(false);
  const [isDeleteGradePending, setIsDeleteGradePending] = useState(false);
  const [isExportingCertificates, setIsExportingCertificates] = useState(false);

  const computeFactorTotal = useMemo(
    () =>
      parseWeight(computeWeights.tasks_weight) +
      parseWeight(computeWeights.final_exam_weight),
    [computeWeights.final_exam_weight, computeWeights.tasks_weight]
  );
  const isComputeWeightTotalValid = Math.abs(computeFactorTotal - 100) <= 0.001;

  function openMissingDataDialog(row: ManagerClassStudentGradeRow) {
    setSelectedMissingRow(row);
    setIsMissingDataOpen(true);
  }

  function openComputeDialog(row: ManagerClassStudentGradeRow) {
    setSelectedRow(row);
    setComputeWeights(
      getComputeFactorWeightFormDefaults({
        stored_tasks_weight: row.stored_tasks_weight,
        stored_final_exam_weight: row.stored_final_exam_weight,
        default_tasks_weight: defaultFactorWeights.tasks_weight,
        default_final_exam_weight: defaultFactorWeights.final_exam_weight,
      })
    );
    setComputeWeightError(null);
    setIsComputeOpen(true);
  }

  function openComputeAllDialog() {
    setIsComputeAllOpen(true);
  }

  function openDeleteGradeDialog(row: ManagerClassStudentGradeRow) {
    setRowToDelete(row);
    setIsDeleteGradeOpen(true);
  }

  async function handleConfirmStudentCompute() {
    if (!selectedRow) {
      return;
    }

    const validationError = validateFactorWeights({
      ...computeWeights,
      group_weight: "0",
      attendee_weight: "0",
    });

    if (validationError) {
      setComputeWeightError(validationError);
      return;
    }

    setIsStudentComputePending(true);
    setComputeWeightError(null);

    try {
      const result = await computeStudentGradeAction(
        classId,
        selectedRow.user_id,
        computeWeights
      );

      if (!result.success) {
        showErrorToast(result.error ?? "Unable to compute grade.");
        return;
      }

      showSuccessToast(result.message ?? `Computed ${selectedRow.full_name}.`);
      setIsComputeOpen(false);
      setSelectedRow(null);
      if (result.row) {
        setGradeRows((current) => mergeGradeRow(current, result.row!));
      }
    } finally {
      setIsStudentComputePending(false);
    }
  }

  async function handleConfirmComputeAll() {
    setIsComputeAllPending(true);

    try {
      const pendingUserIds = pendingRows.map((row) => row.user_id);
      const result = await computeAllStudentGradesAction(classId, pendingUserIds);

      if (!result.success) {
        showErrorToast(result.error ?? "Unable to compute grades.");
        return;
      }

      showSuccessToast(result.message ?? "Students computed.");
      setIsComputeAllOpen(false);
      if (result.rows) {
        setGradeRows((current) =>
          result.rows!.reduce(
            (nextRows, row) => mergeGradeRow(nextRows, row),
            current
          )
        );
      }
    } finally {
      setIsComputeAllPending(false);
    }
  }

  async function handleCustomizeComputeAllConfirm({
    factorWeights,
    taskWeights,
  }: {
    factorWeights: FactorWeightsValues;
    taskWeights: Record<string, string>;
  }) {
    setIsCustomizeComputeAllPending(true);

    try {
      const pendingUserIds = pendingRows.map((row) => row.user_id);
      const result = await computeAllStudentGradesAction(classId, pendingUserIds, {
        factorWeights,
        taskWeights,
        computeLabel: "customized weights",
      });

      if (!result.success) {
        showErrorToast(result.error ?? "Unable to compute grades.");
        return;
      }

      showSuccessToast(result.message ?? "Students computed.");
      setIsCustomizeComputeAllOpen(false);
      if (result.rows) {
        setGradeRows((current) =>
          result.rows!.reduce(
            (nextRows, row) => mergeGradeRow(nextRows, row),
            current
          )
        );
      }
    } finally {
      setIsCustomizeComputeAllPending(false);
    }
  }

  async function handleDeleteComputedGrade() {
    if (!rowToDelete) {
      return;
    }

    setIsDeleteGradePending(true);

    try {
      const result = await deleteComputedGradeAction(classId, rowToDelete.user_id);

      if (!result.success) {
        showErrorToast(result.error ?? "Unable to delete computed grade.");
        return;
      }

      showSuccessToast(
        result.message ?? `Deleted computed grade for ${rowToDelete.full_name}.`
      );
      setIsDeleteGradeOpen(false);
      setRowToDelete(null);
      setGradeRows((current) =>
        current.map((row) =>
          row.user_id === rowToDelete.user_id ? clearComputedGradeFields(row) : row
        )
      );
    } finally {
      setIsDeleteGradePending(false);
    }
  }

  async function handleExportAllCertificates() {
    setIsExportingCertificates(true);

    try {
      const result = await fetchComputedGradeSheetBundlesAction(classId);

      if (!result.success || !result.classRow || !result.bundles) {
        showErrorToast(result.error ?? "Unable to export grade certificates.");
        return;
      }

      const { downloadComputedGradeCertificatesZip } = await import(
        "@/lib/export/student-grade-certificates-zip-export"
      );
      const count = await downloadComputedGradeCertificatesZip({
        classRow: result.classRow,
        bundles: result.bundles,
      });

      showSuccessToast(`Exported ${count} grade certificate${count === 1 ? "" : "s"}.`);
    } catch {
      showErrorToast("Unable to export grade certificates.");
    } finally {
      setIsExportingCertificates(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Dialog
        open={isComputeOpen}
        onOpenChange={(open) => {
          if (!isStudentComputePending) {
            setIsComputeOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedRow ? `Compute ${selectedRow.full_name}` : "Compute student"}
            </DialogTitle>
            <DialogDescription>
              Review this student&apos;s grade totals and set the weights to apply
              for this compute.
            </DialogDescription>
          </DialogHeader>

          {selectedRow ? (
            <div className="grid gap-4">
              <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total grade
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatGrade(selectedRow.total_grade)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Tasks grade
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatGrade(selectedRow.task_total_grade)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Final exam grade
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatGrade(selectedRow.final_exam_grade)}
                  </p>
                </div>
              </div>

              <ComputeFactorWeightsFields
                idPrefix="class-grades-compute"
                values={computeWeights}
                onChange={setComputeWeights}
                error={computeWeightError}
              />
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button
              type="button"
              className="bg-orange-500 text-white hover:bg-orange-500/90"
              disabled={isStudentComputePending || !isComputeWeightTotalValid}
              onClick={handleConfirmStudentCompute}
            >
              {isStudentComputePending ? <InlineSpinner className="mr-2" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isComputeAllOpen}
        onOpenChange={(open) => {
          if (!isComputeAllPending) {
            setIsComputeAllOpen(open);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Compute all students</DialogTitle>
            <DialogDescription>
              Review the class weights and the grading rules that will be applied to all enrolled students.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Tasks weight</p>
                <p className="text-sm font-medium">
                  {formatWeight(defaultFactorWeights.tasks_weight)}
                </p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Final exam weight</p>
                <p className="text-sm font-medium">
                  {formatWeight(defaultFactorWeights.final_exam_weight)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <h3 className="text-sm font-medium">Calculation notes</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>
                  `Final exam grade` comes from the class final exam result once that grading is completed.
                </li>
                <li>
                  `Tasks grade` is based on the student&apos;s graded tasks and assignments linked to the class sessions.
                </li>
                <li>
                  Group and attendance session data live on the student detail page as JSON snapshots.
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter showCloseButton>
            <Button
              type="button"
              className="bg-orange-500 text-white hover:bg-orange-500/90"
              disabled={isComputeAllPending}
              onClick={handleConfirmComputeAll}
            >
              {isComputeAllPending ? <InlineSpinner className="mr-2" /> : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomizeComputeAllDialog
        open={isCustomizeComputeAllOpen}
        onOpenChange={setIsCustomizeComputeAllOpen}
        className={classRow.name}
        classTasks={classTasks}
        pendingCount={pendingRows.length}
        isConfirmPending={isCustomizeComputeAllPending}
        onConfirm={handleCustomizeComputeAllConfirm}
      />

      <StudentGradeMissingDataDialog
        open={isMissingDataOpen}
        onOpenChange={(open) => {
          setIsMissingDataOpen(open);
          if (!open) {
            setSelectedMissingRow(null);
          }
        }}
        classId={classId}
        student={selectedMissingRow}
        finalExam={finalExam}
        finalExamStudentGrade={
          selectedMissingRow
            ? (finalExamGradeByUserId.get(selectedMissingRow.user_id) ?? null)
            : null
        }
      />

      <Dialog
        open={isDeleteGradeOpen}
        onOpenChange={(open) => {
          if (isDeleteGradePending) {
            return;
          }

          setIsDeleteGradeOpen(open);
          if (!open) {
            setRowToDelete(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete computed grade</DialogTitle>
            <DialogDescription>
              {rowToDelete
                ? `Remove the computed grade for ${rowToDelete.full_name}? This will move the student back to the pending table.`
                : "Remove this computed grade? This will move the student back to the pending table."}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter showCloseButton>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleteGradePending}
              onClick={handleDeleteComputedGrade}
            >
              {isDeleteGradePending ? <InlineSpinner className="mr-2" /> : null}
              Delete grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Students grades</h2>
          <p className="text-sm text-muted-foreground">
            Current enrolled students in {classRow.name} with grade summaries from tasks and final exam data.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Can permission={PERMISSIONS.GRADES_COMPUTE_CUSTOM}>
            <Button
              type="button"
              variant="outline"
              disabled={pendingRows.length === 0}
              onClick={() => setIsCustomizeComputeAllOpen(true)}
            >
              Customize compute all
            </Button>
          </Can>
          <Can permission={PERMISSIONS.GRADES_COMPUTE_ALL}>
            <Button
              type="button"
              className="bg-orange-500 text-white hover:bg-orange-500/90"
              disabled={pendingRows.length === 0}
              onClick={openComputeAllDialog}
            >
              Compute all
            </Button>
          </Can>
        </div>
      </div>

      <ClassTabCollapsibleSection
          title="Students ready to compute"
          description="Students with all weighted grade data present and ready for computation."
          defaultOpen
        >
          {pendingRows.length === 0 ? (
            <div className="px-4 py-3">
              <EmptyState
                size="sm"
                icon={UsersIcon}
                title="No students ready"
                description="No students are ready to compute in this class."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Total grade</th>
                    <th className="px-4 py-3 font-medium">Tasks grade</th>
                    <th className="px-4 py-3 font-medium">Final exam grade</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRows.map((row) => (
                    <tr
                      key={row.student_profile_id}
                      className="border-b last:border-b-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <StudentGradeNameLink
                            classId={classId}
                            studentProfileId={row.student_profile_id}
                            fullName={row.full_name}
                          />
                          <span className="text-xs text-muted-foreground">
                            Member
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.email}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.phone ?? "—"}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatGrade(row.total_grade)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatGrade(row.task_total_grade)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatGrade(row.final_exam_grade)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <Can permission={PERMISSIONS.GRADES_COMPUTE}>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-orange-500 text-white hover:bg-orange-500/90"
                              onClick={() => openComputeDialog(row)}
                            >
                              Compute
                            </Button>
                          </Can>
                          <Link
                            href={getManagerClassStudentGradesDetailRoute(
                              classId,
                              row.student_profile_id
                            )}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                            })}
                          >
                            <EyeIcon data-icon="inline-start" />
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ClassTabCollapsibleSection>

        <ClassTabCollapsibleSection
          title="Done computed students"
          description="Students computed with class or customized weights in this session."
        >
          <div className="px-4 pt-2 pb-3">
            {computedRows.length === 0 ? (
              <EmptyState
                size="sm"
                icon={UsersIcon}
                title="No computed students"
                description="No students have been computed yet."
              />
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Can permission={PERMISSIONS.GRADES_EXPORT_CERTIFICATES}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isExportingCertificates}
                      onClick={() => {
                        void handleExportAllCertificates();
                      }}
                    >
                      {isExportingCertificates ? (
                        <InlineSpinner />
                      ) : (
                        <DownloadIcon data-icon="inline-start" />
                      )}
                      Export all certificates
                    </Button>
                  </Can>
                </div>
              {groupedComputedRows.map(({ batch, rows: batchRows }) => (
                <div
                  key={batch.id}
                  className="overflow-hidden rounded-xl border bg-background"
                >
                  <div className="border-b bg-muted/30 px-4 py-3">
                    <div className="flex flex-col gap-3 @2xl/panel:flex-row @2xl/panel:items-start @2xl/panel:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">{batch.label}</h4>
                        <p className="text-xs text-muted-foreground">
                          {batchRows.length} computed student
                          {batchRows.length === 1 ? "" : "s"} in this batch
                        </p>
                      </div>
                      <div className="grid gap-2 text-xs text-muted-foreground @lg/panel:grid-cols-2">
                        <div className="rounded-lg border bg-background px-3 py-2">
                          <span className="block">Tasks weight</span>
                          <span className="font-medium text-foreground">
                            {formatWeight(batch.factorWeights.tasks_weight)}
                          </span>
                        </div>
                        <div className="rounded-lg border bg-background px-3 py-2">
                          <span className="block">Final exam weight</span>
                          <span className="font-medium text-foreground">
                            {formatWeight(batch.factorWeights.final_exam_weight)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">Task weights</p>
                      {Object.keys(batch.taskWeights).length === 0 ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          No task-specific weights were applied.
                        </p>
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {classTasks.map((task) => (
                            <span
                              key={`${batch.id}-${task.id}`}
                              className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                            >
                              {task.session_label} {task.title}:{" "}
                              <span className="font-medium text-foreground">
                                {batch.taskWeights[task.id] ?? "0"}%
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[820px] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left">
                          <th className="px-4 py-3 font-medium">Student</th>
                          <th className="px-4 py-3 font-medium">Email</th>
                          <th className="px-4 py-3 font-medium">Total grade</th>
                          <th className="px-4 py-3 font-medium">Tasks</th>
                          <th className="px-4 py-3 font-medium">Final exam</th>
                          <th className="px-4 py-3 text-center font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchRows.map((row) => (
                          <tr
                            key={`computed-${batch.id}-${row.student_profile_id}`}
                            className="border-b last:border-b-0 hover:bg-muted/20"
                          >
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <StudentGradeNameLink
                                  classId={classId}
                                  studentProfileId={row.student_profile_id}
                                  fullName={row.full_name}
                                />
                                <span className="text-xs text-muted-foreground">
                                  Member
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {row.email}
                            </td>
                            <td className="px-4 py-3 tabular-nums font-medium">
                              {formatGrade(row.total_grade)}
                            </td>
                            <td className="px-4 py-3 tabular-nums">
                              {formatGrade(row.task_total_grade)}
                            </td>
                            <td className="px-4 py-3 tabular-nums">
                              {formatGrade(row.final_exam_grade)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center gap-2">
                                <Link
                                  href={getManagerClassStudentGradesDetailRoute(
                                    classId,
                                    row.student_profile_id
                                  )}
                                  className={buttonVariants({
                                    variant: "outline",
                                    size: "sm",
                                  })}
                                >
                                  <EyeIcon data-icon="inline-start" />
                                  Details
                                </Link>
                                <Can permission={PERMISSIONS.GRADES_DELETE}>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => openDeleteGradeDialog(row)}
                                  >
                                    Delete grade
                                  </Button>
                                </Can>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
              </div>
            )}
          </div>
        </ClassTabCollapsibleSection>

        <ClassTabCollapsibleSection
          title="Unready students"
          description="Students missing one or more weighted grade inputs, so they cannot be computed yet."
        >
          {unreadyRows.length === 0 ? (
            <div className="px-4 py-3">
              <EmptyState
                size="sm"
                icon={UsersIcon}
                title="No unready students"
                description="No unready students in this class."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Missing data</th>
                    <th className="px-4 py-3 font-medium">Tasks</th>
                    <th className="px-4 py-3 font-medium">Final exam</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {unreadyRows.map((row) => (
                    <tr
                      key={`unready-${row.student_profile_id}`}
                      className="border-b last:border-b-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <StudentGradeNameLink
                            classId={classId}
                            studentProfileId={row.student_profile_id}
                            fullName={row.full_name}
                          />
                          <span className="text-xs text-muted-foreground">
                            Member
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {row.email}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`View missing grade data for ${row.full_name}`}
                            onClick={() => openMissingDataDialog(row)}
                          >
                            <MessageSquareTextIcon />
                          </Button>
                          {row.missing_items.length > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              ({row.missing_items.length})
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatGrade(row.task_total_grade)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatGrade(row.final_exam_grade)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <Link
                            href={getManagerClassStudentGradesDetailRoute(
                              classId,
                              row.student_profile_id
                            )}
                            className={buttonVariants({
                              variant: "outline",
                              size: "sm",
                            })}
                          >
                            <EyeIcon data-icon="inline-start" />
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ClassTabCollapsibleSection>

      <ClassFastCertificatePanel
        classId={classId}
        classRow={classRow}
        studentRows={gradeRows}
      />
    </div>
  );
}
