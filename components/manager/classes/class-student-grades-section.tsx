"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { EyeIcon } from "lucide-react";
import { CustomizeComputeAllDialog } from "@/components/manager/classes/customize-compute-all-dialog";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  type FactorWeightsValues,
} from "@/lib/compute/custom-compute-form-utils";
import { DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS } from "@/lib/constants/manager-class-grade-defaults";
import { getManagerClassStudentGradesDetailRoute } from "@/lib/constants/routes";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassTaskForGradesRow } from "@/types/manager-class-task-for-grades";
import {
  computeAllStudentGradesAction,
  computeStudentGradeAction,
  deleteComputedGradeAction,
} from "@/app/manager/classes/grades/actions";

type ClassStudentGradesSectionProps = {
  classId: string;
  className: string;
  rows: ManagerClassStudentGradeRow[];
  classTasks: ManagerClassTaskForGradesRow[];
};

type ComputeBatch = {
  id: string;
  label: string;
  factorWeights: FactorWeightsValues;
  taskWeights: Record<string, string>;
};

type UnreadyReason = "tasks" | "final_exam";

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

function getUnreadyReasons(
  row: ManagerClassStudentGradeRow,
  factorWeights: FactorWeightsValues
): UnreadyReason[] {
  const reasons: UnreadyReason[] = [];

  if (factorWeights.tasks_weight > 0 && row.task_total_grade === null) {
    reasons.push("tasks");
  }

  if (factorWeights.final_exam_weight > 0 && row.final_exam_grade === null) {
    reasons.push("final_exam");
  }

  return reasons;
}

function formatUnreadyReason(reason: UnreadyReason) {
  switch (reason) {
    case "tasks":
      return "Missing tasks grade";
    case "final_exam":
      return "Missing final exam grade";
  }
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

export function ClassStudentGradesSection({
  classId,
  className,
  rows,
  classTasks,
}: ClassStudentGradesSectionProps) {
  const router = useRouter();
  const defaultFactorWeights = DEFAULT_CLASS_GRADE_FACTOR_WEIGHTS;
  const defaultTaskWeights = useMemo(
    () => buildDefaultTaskWeights(classTasks),
    [classTasks]
  );
  const [gradeRows, setGradeRows] = useState(rows);

  useEffect(() => {
    setGradeRows(rows);
  }, [rows]);

  const unreadyRows = useMemo(
    () =>
      gradeRows.filter(
        (row) =>
          !row.is_computed &&
          getUnreadyReasons(row, defaultFactorWeights).length > 0
      ),
    [defaultFactorWeights, gradeRows]
  );
  const pendingRows = useMemo(
    () =>
      gradeRows.filter(
        (row) =>
          !row.is_computed &&
          getUnreadyReasons(row, defaultFactorWeights).length === 0
      ),
    [defaultFactorWeights, gradeRows]
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

  function openComputeDialog(row: ManagerClassStudentGradeRow) {
    setSelectedRow(row);
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

    const result = await computeStudentGradeAction(classId, selectedRow.user_id);

    if (!result.success) {
      showErrorToast(result.error ?? "Unable to compute grade.");
      return;
    }

    showSuccessToast(result.message ?? `Computed ${selectedRow.full_name}.`);
    setIsComputeOpen(false);
    setSelectedRow(null);
    router.refresh();
  }

  async function handleConfirmComputeAll() {
    const pendingUserIds = pendingRows.map((row) => row.user_id);
    const result = await computeAllStudentGradesAction(classId, pendingUserIds);

    if (!result.success) {
      showErrorToast(result.error ?? "Unable to compute grades.");
      return;
    }

    showSuccessToast(result.message ?? "Students computed.");
    setIsComputeAllOpen(false);
    router.refresh();
  }

  async function handleCustomizeComputeAllConfirm({
    factorWeights,
    taskWeights,
  }: {
    factorWeights: FactorWeightsValues;
    taskWeights: Record<string, string>;
  }) {
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
    router.refresh();
  }

  async function handleDeleteComputedGrade() {
    if (!rowToDelete) {
      return;
    }

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
    router.refresh();
  }

  return (
    <Card className="py-0">
      <Dialog open={isComputeOpen} onOpenChange={setIsComputeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedRow ? `Compute ${selectedRow.full_name}` : "Compute student"}
            </DialogTitle>
            <DialogDescription>
              Review this student&apos;s current grade totals and the class weights that will be applied.
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

              <div className="rounded-xl border bg-muted/20 p-4">
                <h3 className="text-sm font-medium">Applied weights</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
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
              </div>
            </div>
          ) : null}

          <DialogFooter showCloseButton>
            <Button
              type="button"
              className="bg-orange-500 text-white hover:bg-orange-500/90"
              onClick={handleConfirmStudentCompute}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isComputeAllOpen} onOpenChange={setIsComputeAllOpen}>
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
              onClick={handleConfirmComputeAll}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomizeComputeAllDialog
        open={isCustomizeComputeAllOpen}
        onOpenChange={setIsCustomizeComputeAllOpen}
        className={className}
        classTasks={classTasks}
        pendingCount={pendingRows.length}
        onConfirm={handleCustomizeComputeAllConfirm}
      />

      <Dialog
        open={isDeleteGradeOpen}
        onOpenChange={(open) => {
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
              onClick={handleDeleteComputedGrade}
            >
              Delete grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CardHeader className="border-b bg-muted/40 py-3">
        <div>
          <CardTitle>Students grades</CardTitle>
          <p className="text-sm text-muted-foreground">
            Current enrolled students in {className} with grade summaries from tasks and final exam data.
          </p>
        </div>
        <CardAction className="self-center">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pendingRows.length === 0}
              onClick={() => setIsCustomizeComputeAllOpen(true)}
            >
              Customize compute all
            </Button>
            <Button
              type="button"
              className="bg-orange-500 text-white hover:bg-orange-500/90"
              disabled={pendingRows.length === 0}
              onClick={openComputeAllDialog}
            >
              Compute all
            </Button>
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-4 px-4 pb-4 pt-2">
        <ClassTabCollapsibleSection
          title="Students ready to compute"
          description="Students with all weighted grade data present and ready for computation."
        >
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
                {pendingRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No students are ready to compute in this class.
                    </td>
                  </tr>
                ) : (
                  pendingRows.map((row) => (
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
                            {row.enrollment_status}
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
                          <Button
                            type="button"
                            size="sm"
                            className="bg-orange-500 text-white hover:bg-orange-500/90"
                            onClick={() => openComputeDialog(row)}
                          >
                            Compute
                          </Button>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </ClassTabCollapsibleSection>

        <ClassTabCollapsibleSection
          title="Done computed students"
          description="Students computed with class or customized weights in this session."
        >
          <div className="px-4 pt-2 pb-3">
            {computedRows.length === 0 ? (
              <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No students have been computed yet.
              </div>
            ) : (
              <div className="space-y-4">
              {groupedComputedRows.map(({ batch, rows: batchRows }) => (
                <div
                  key={batch.id}
                  className="overflow-hidden rounded-xl border bg-background"
                >
                  <div className="border-b bg-muted/30 px-4 py-3">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h4 className="text-sm font-semibold">{batch.label}</h4>
                        <p className="text-xs text-muted-foreground">
                          {batchRows.length} computed student
                          {batchRows.length === 1 ? "" : "s"} in this batch
                        </p>
                      </div>
                      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
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
                                  {row.enrollment_status}
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
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => openDeleteGradeDialog(row)}
                                >
                                  Delete grade
                                </Button>
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
                {unreadyRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No unready students in this class.
                    </td>
                  </tr>
                ) : (
                  unreadyRows.map((row) => {
                    const missingReasons = getUnreadyReasons(row, defaultFactorWeights);

                    return (
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
                              {row.enrollment_status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {row.email}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {missingReasons.map((reason) => (
                              <span
                                key={`${row.student_profile_id}-${reason}`}
                                className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200"
                              >
                                {formatUnreadyReason(reason)}
                              </span>
                            ))}
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </ClassTabCollapsibleSection>
      </CardContent>
    </Card>
  );
}
