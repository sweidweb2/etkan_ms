"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  computePreviewTotalGrade,
  type FactorWeightsValues,
} from "@/lib/compute/custom-compute-form-utils";
import { getManagerClassWeightsPreview } from "@/lib/constants/manager-class-weights-mock";
import { getManagerClassStudentGradesDetailRoute } from "@/lib/constants/routes";
import { getManagerClassTasksPreview } from "@/lib/manager/get-manager-class-tasks-preview";
import { showSuccessToast } from "@/lib/toast";
import type { ManagerClassStudentGradeRow } from "@/types/manager-class-student-grade";
import type { ManagerClassWeightsRow } from "@/types/manager-class-weights";

type ClassStudentGradesSectionProps = {
  classId: string;
  className: string;
  rows: ManagerClassStudentGradeRow[];
  initialWeights: ManagerClassWeightsRow;
};

type ComputeBatch = {
  id: string;
  label: string;
  factorWeights: FactorWeightsValues;
  taskWeights: Record<string, string>;
};

type UnreadyReason = "group" | "tasks" | "attendance" | "final_exam";

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
  return `${label} · G ${formatWeight(factorWeights.group_weight)} · T ${formatWeight(
    factorWeights.tasks_weight
  )} · A ${formatWeight(factorWeights.attendee_weight)} · F ${formatWeight(
    factorWeights.final_exam_weight
  )}`;
}

function getUnreadyReasons(
  row: ManagerClassStudentGradeRow,
  factorWeights: FactorWeightsValues
): UnreadyReason[] {
  const reasons: UnreadyReason[] = [];

  if (factorWeights.group_weight > 0 && row.total_group_grade === null) {
    reasons.push("group");
  }

  if (factorWeights.tasks_weight > 0 && row.task_total_grade === null) {
    reasons.push("tasks");
  }

  if (factorWeights.attendee_weight > 0 && row.total_attendee_grade === null) {
    reasons.push("attendance");
  }

  if (factorWeights.final_exam_weight > 0 && row.final_exam_grade === null) {
    reasons.push("final_exam");
  }

  return reasons;
}

function formatUnreadyReason(reason: UnreadyReason) {
  switch (reason) {
    case "group":
      return "Missing group grade";
    case "tasks":
      return "Missing tasks grade";
    case "attendance":
      return "Missing attendance grade";
    case "final_exam":
      return "Missing final exam grade";
  }
}

function toFactorWeightsFromClassWeights(
  weights: ManagerClassWeightsRow
): FactorWeightsValues {
  return {
    group_weight: weights.group_weight,
    final_exam_weight: weights.final_exam_weight,
    tasks_weight: weights.tasks_weight,
    attendee_weight: weights.attendee_weight,
  };
}

function applyComputedWeights(
  rows: ManagerClassStudentGradeRow[],
  studentProfileIds: string[],
  factorWeights: FactorWeightsValues
) {
  const idSet = new Set(studentProfileIds);

  return rows.map((row) => {
    if (!idSet.has(row.student_profile_id)) {
      return row;
    }

    return {
      ...row,
      is_computed: true,
      total_grade: computePreviewTotalGrade(row, factorWeights),
    };
  });
}

export function ClassStudentGradesSection({
  classId,
  className,
  rows,
  initialWeights,
}: ClassStudentGradesSectionProps) {
  const classTasks = useMemo(() => getManagerClassTasksPreview(classId), [classId]);
  const defaultTaskWeights = useMemo(
    () => buildDefaultTaskWeights(classTasks),
    [classTasks]
  );
  const initialFactorWeights = useMemo(
    () => toFactorWeightsFromClassWeights(initialWeights),
    [initialWeights]
  );
  const defaultBatch = useMemo<ComputeBatch>(
    () => ({
      id: buildBatchSignature(initialFactorWeights, defaultTaskWeights),
      label: buildBatchLabel("Class weights", initialFactorWeights),
      factorWeights: initialFactorWeights,
      taskWeights: defaultTaskWeights,
    }),
    [defaultTaskWeights, initialFactorWeights]
  );
  const [gradeRows, setGradeRows] = useState(rows);
  const [computedBatchByStudentId, setComputedBatchByStudentId] = useState<
    Record<string, string>
  >(() =>
    Object.fromEntries(
      rows
        .filter((row) => row.is_computed)
        .map((row) => [row.student_profile_id, defaultBatch.id])
    )
  );
  const [computeBatches, setComputeBatches] = useState<Record<string, ComputeBatch>>({
    [defaultBatch.id]: defaultBatch,
  });
  const unreadyRows = useMemo(
    () =>
      gradeRows.filter(
        (row) =>
          !row.is_computed && getUnreadyReasons(row, initialFactorWeights).length > 0
      ),
    [gradeRows, initialFactorWeights]
  );
  const pendingRows = useMemo(
    () =>
      gradeRows.filter(
        (row) =>
          !row.is_computed && getUnreadyReasons(row, initialFactorWeights).length === 0
      ),
    [gradeRows, initialFactorWeights]
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
      const batchId = computedBatchByStudentId[row.student_profile_id] ?? defaultBatch.id;
      const batch = computeBatches[batchId] ?? defaultBatch;
      const existing = groups.get(batch.id);

      if (existing) {
        existing.rows.push(row);
      } else {
        groups.set(batch.id, { batch, rows: [row] });
      }
    }

    return Array.from(groups.values());
  }, [computeBatches, computedBatchByStudentId, computedRows, defaultBatch]);
  const [selectedRow, setSelectedRow] = useState<ManagerClassStudentGradeRow | null>(
    null
  );
  const [rowToDelete, setRowToDelete] =
    useState<ManagerClassStudentGradeRow | null>(null);
  const [isComputeOpen, setIsComputeOpen] = useState(false);
  const [isComputeAllOpen, setIsComputeAllOpen] = useState(false);
  const [isCustomizeComputeAllOpen, setIsCustomizeComputeAllOpen] = useState(false);
  const [isDeleteGradeOpen, setIsDeleteGradeOpen] = useState(false);
  const [activeWeights, setActiveWeights] = useState(initialWeights);

  function openComputeDialog(row: ManagerClassStudentGradeRow) {
    setActiveWeights(getManagerClassWeightsPreview(classId));
    setSelectedRow(row);
    setIsComputeOpen(true);
  }

  function openComputeAllDialog() {
    setActiveWeights(getManagerClassWeightsPreview(classId));
    setIsComputeAllOpen(true);
  }

  function openDeleteGradeDialog(row: ManagerClassStudentGradeRow) {
    setRowToDelete(row);
    setIsDeleteGradeOpen(true);
  }

  function markStudentsComputed(
    studentProfileIds: string[],
    factorWeights: FactorWeightsValues,
    taskWeights: Record<string, string>,
    batchLabel: string,
    successMessage: string
  ) {
    if (studentProfileIds.length === 0) {
      return;
    }

    const batchId = buildBatchSignature(factorWeights, taskWeights);
    const batch: ComputeBatch = {
      id: batchId,
      label: buildBatchLabel(batchLabel, factorWeights),
      factorWeights,
      taskWeights,
    };

    setGradeRows((current) =>
      applyComputedWeights(current, studentProfileIds, factorWeights)
    );
    setComputeBatches((current) => ({
      ...current,
      [batchId]: batch,
    }));
    setComputedBatchByStudentId((current) => ({
      ...current,
      ...Object.fromEntries(studentProfileIds.map((studentId) => [studentId, batchId])),
    }));
    showSuccessToast(successMessage);
  }

  function handleConfirmStudentCompute() {
    if (!selectedRow) {
      return;
    }

    markStudentsComputed(
      [selectedRow.student_profile_id],
      toFactorWeightsFromClassWeights(activeWeights),
      defaultTaskWeights,
      "Class weights",
      `Computed ${selectedRow.full_name} using class weights.`
    );
    setIsComputeOpen(false);
    setSelectedRow(null);
  }

  function handleConfirmComputeAll() {
    const pendingIds = pendingRows.map((row) => row.student_profile_id);

    markStudentsComputed(
      pendingIds,
      toFactorWeightsFromClassWeights(activeWeights),
      defaultTaskWeights,
      "Class weights",
      `Computed ${pendingIds.length} student${pendingIds.length === 1 ? "" : "s"} in ${className} using class weights.`
    );
    setIsComputeAllOpen(false);
  }

  function handleCustomizeComputeAllConfirm({
    factorWeights,
    taskWeights,
  }: {
    factorWeights: FactorWeightsValues;
    taskWeights: Record<string, string>;
  }) {
    const pendingIds = pendingRows.map((row) => row.student_profile_id);

    markStudentsComputed(
      pendingIds,
      factorWeights,
      taskWeights,
      "Customized weights",
      `Computed ${pendingIds.length} student${pendingIds.length === 1 ? "" : "s"} in ${className} using customized weights.`
    );
  }

  function handleDeleteComputedGrade() {
    if (!rowToDelete) {
      return;
    }

    setGradeRows((current) =>
      current.map((row) =>
        row.student_profile_id === rowToDelete.student_profile_id
          ? {
              ...row,
              is_computed: false,
            }
          : row
      )
    );
    setComputedBatchByStudentId((current) => {
      const next = { ...current };
      delete next[rowToDelete.student_profile_id];
      return next;
    });
    showSuccessToast(`Deleted computed preview for ${rowToDelete.full_name}.`);
    setIsDeleteGradeOpen(false);
    setRowToDelete(null);
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
                    Final exam grade
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatGrade(selectedRow.final_exam_grade)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total group grade
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatGrade(selectedRow.total_group_grade)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Total attendee grade
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatGrade(selectedRow.total_attendee_grade)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-muted/20 p-4">
                <h3 className="text-sm font-medium">Applied weights</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Group weight</p>
                    <p className="text-sm font-medium">
                      {formatWeight(activeWeights.group_weight)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Final exam weight</p>
                    <p className="text-sm font-medium">
                      {formatWeight(activeWeights.final_exam_weight)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Tasks weight</p>
                    <p className="text-sm font-medium">
                      {formatWeight(activeWeights.tasks_weight)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-background px-3 py-2">
                    <p className="text-xs text-muted-foreground">Attendance weight</p>
                    <p className="text-sm font-medium">
                      {formatWeight(activeWeights.attendee_weight)}
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
                <p className="text-xs text-muted-foreground">Group weight</p>
                <p className="text-sm font-medium">
                  {formatWeight(activeWeights.group_weight)}
                </p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Final exam weight</p>
                <p className="text-sm font-medium">
                  {formatWeight(activeWeights.final_exam_weight)}
                </p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Tasks weight</p>
                <p className="text-sm font-medium">
                  {formatWeight(activeWeights.tasks_weight)}
                </p>
              </div>
              <div className="rounded-lg border bg-background px-3 py-2">
                <p className="text-xs text-muted-foreground">Attendance weight</p>
                <p className="text-sm font-medium">
                  {formatWeight(activeWeights.attendee_weight)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/20 p-4">
              <h3 className="text-sm font-medium">Calculation notes</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>
                  `Total group grade` comes from the student&apos;s combined group-grade performance across the class sessions.
                </li>
                <li>
                  `Final exam grade` comes from the class final exam result once that grading is completed.
                </li>
                <li>
                  `Tasks grade` is based on the student&apos;s graded tasks and assignments linked to the class sessions.
                </li>
                <li>
                  `Attendance grade` is derived from the student&apos;s present or absent session records.
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
        classId={classId}
        className={className}
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
                ? `Remove the computed preview for ${rowToDelete.full_name}? This will move the student back to the pending table.`
                : "Remove this computed preview? This will move the student back to the pending table."}
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

      <CardHeader className="border-b bg-muted/40 py-4">
        <div>
          <CardTitle>Students grades</CardTitle>
          <p className="text-sm text-muted-foreground">
            Current enrolled students in {className} with grade summary columns. Computed values will be connected to backend data later.
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

      <CardContent className="space-y-4 px-4 pb-4 pt-4">
        <ClassTabCollapsibleSection
          title="Students ready to compute"
          description="Students with all weighted grade data present and ready for computation."
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Total grade</th>
                  <th className="px-4 py-3 font-medium">Total group grade</th>
                  <th className="px-4 py-3 font-medium">Tasks grade</th>
                  <th className="px-4 py-3 font-medium">Total attendee grade</th>
                  <th className="px-4 py-3 font-medium">Final exam grade</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
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
                          <span className="font-medium">{row.full_name}</span>
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
                        {formatGrade(row.total_group_grade)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatGrade(row.task_total_grade)}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatGrade(row.total_attendee_grade)}
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
          <div className="px-4 py-4">
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
                      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-lg border bg-background px-3 py-2">
                          <span className="block">Group weight</span>
                          <span className="font-medium text-foreground">
                            {formatWeight(batch.factorWeights.group_weight)}
                          </span>
                        </div>
                        <div className="rounded-lg border bg-background px-3 py-2">
                          <span className="block">Tasks weight</span>
                          <span className="font-medium text-foreground">
                            {formatWeight(batch.factorWeights.tasks_weight)}
                          </span>
                        </div>
                        <div className="rounded-lg border bg-background px-3 py-2">
                          <span className="block">Attendance weight</span>
                          <span className="font-medium text-foreground">
                            {formatWeight(batch.factorWeights.attendee_weight)}
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
                    <table className="w-full min-w-[1020px] text-sm">
                      <thead>
                        <tr className="border-b bg-muted/40 text-left">
                          <th className="px-4 py-3 font-medium">Student</th>
                          <th className="px-4 py-3 font-medium">Email</th>
                          <th className="px-4 py-3 font-medium">Total grade</th>
                          <th className="px-4 py-3 font-medium">Group</th>
                          <th className="px-4 py-3 font-medium">Tasks</th>
                          <th className="px-4 py-3 font-medium">Attendance</th>
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
                                <span className="font-medium">{row.full_name}</span>
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
                              {formatGrade(row.total_group_grade)}
                            </td>
                            <td className="px-4 py-3 tabular-nums">
                              {formatGrade(row.task_total_grade)}
                            </td>
                            <td className="px-4 py-3 tabular-nums">
                              {formatGrade(row.total_attendee_grade)}
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
            <table className="w-full min-w-[1060px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Missing data</th>
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium">Tasks</th>
                  <th className="px-4 py-3 font-medium">Attendance</th>
                  <th className="px-4 py-3 font-medium">Final exam</th>
                  <th className="px-4 py-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {unreadyRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No unready students in this class.
                    </td>
                  </tr>
                ) : (
                  unreadyRows.map((row) => {
                    const missingReasons = getUnreadyReasons(row, initialFactorWeights);

                    return (
                      <tr
                        key={`unready-${row.student_profile_id}`}
                        className="border-b last:border-b-0 hover:bg-muted/20"
                      >
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium">{row.full_name}</span>
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
                          {formatGrade(row.total_group_grade)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatGrade(row.task_total_grade)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatGrade(row.total_attendee_grade)}
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
