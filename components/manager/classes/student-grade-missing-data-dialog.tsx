"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardListIcon } from "lucide-react";
import { EditStudentFinalExamGradeSheet } from "@/components/manager/classes/edit-student-finalexam-grade-sheet";
import { EditStudentTaskSheet } from "@/components/manager/classes/edit-student-task-sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { MANAGER_STUDENT_TASK_STATUS_LABELS } from "@/lib/constants/manager-student-task-display";
import {
  getManagerClassDetailRoute,
  getManagerClassTaskDetailRoute,
} from "@/lib/constants/routes";
import { formatYesNoGrade } from "@/lib/format/format-task-grade";
import type { ManagerClassFinalExamRow, ManagerStudentFinalExamGradeRow } from "@/types/manager-class-final-exam";
import type {
  ManagerClassStudentGradeMissingItem,
  ManagerClassStudentGradeRow,
} from "@/types/manager-class-student-grade";
import type { ManagerStudentTaskRow } from "@/types/manager-class-session-detail";
import type { StudentTaskStatusValue } from "@/lib/constants/manager-student-task-status";

type StudentGradeMissingDataDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classId: string;
  student: ManagerClassStudentGradeRow | null;
  finalExam: ManagerClassFinalExamRow | null;
  finalExamStudentGrade: ManagerStudentFinalExamGradeRow | null;
  onDataChanged?: () => void;
};

function formatGrade(value: number | null) {
  return value === null ? "—" : value.toFixed(1);
}

function formatStatus(status: string | null) {
  if (!status) {
    return "—";
  }

  return (
    MANAGER_STUDENT_TASK_STATUS_LABELS[status as StudentTaskStatusValue] ?? status
  );
}

function MissingItemBadge({ item }: { item: ManagerClassStudentGradeMissingItem }) {
  return (
    <span className="inline-flex rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200">
      {item.label}
    </span>
  );
}

function buildStudentTaskRow(
  student: ManagerClassStudentGradeRow,
  item: ManagerClassStudentGradeMissingItem
): ManagerStudentTaskRow | null {
  if (!item.studentTaskId || !item.taskId) {
    return null;
  }

  return {
    id: item.studentTaskId,
    task_id: item.taskId,
    student_id: student.user_id,
    student_profile_id: student.student_profile_id,
    full_name: student.full_name,
    status: (item.status ?? "pending") as StudentTaskStatusValue,
    submitted_at: null,
    grade: item.grade,
    notes: null,
    student_report: null,
    graded_at: null,
  };
}

export function StudentGradeMissingDataDialog({
  open,
  onOpenChange,
  classId,
  student,
  finalExam,
  finalExamStudentGrade,
  onDataChanged,
}: StudentGradeMissingDataDialogProps) {
  const [taskEditTarget, setTaskEditTarget] =
    useState<ManagerStudentTaskRow | null>(null);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [isFinalExamEditOpen, setIsFinalExamEditOpen] = useState(false);

  const missingItems = useMemo(
    () => student?.missing_items ?? [],
    [student?.missing_items]
  );
  const recordLocked = Boolean(student?.is_computed);
  const taskItems = useMemo(
    () => missingItems.filter((item) => item.kind === "task"),
    [missingItems]
  );
  const finalExamItems = useMemo(
    () => missingItems.filter((item) => item.kind === "final_exam"),
    [missingItems]
  );
  const taskEditItem = taskEditTarget
    ? missingItems.find((item) => item.studentTaskId === taskEditTarget.id)
    : undefined;

  function handleRefresh() {
    onDataChanged?.();
  }

  function openTaskEdit(item: ManagerClassStudentGradeMissingItem) {
    if (!student) {
      return;
    }

    const row = buildStudentTaskRow(student, item);
    if (!row) {
      return;
    }

    setTaskEditTarget(row);
    setIsTaskEditOpen(true);
  }

  function renderItemActions(item: ManagerClassStudentGradeMissingItem) {
    if (item.kind === "task") {
      if (item.studentTaskId && item.taskId) {
        return (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => openTaskEdit(item)}
          >
            Fix task grade
          </Button>
        );
      }

      if (item.taskId) {
        return (
          <Link
            href={getManagerClassTaskDetailRoute(classId, item.taskId)}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Open task
          </Link>
        );
      }

      return null;
    }

    if (item.finalExamGradeId && finalExamStudentGrade) {
      return (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setIsFinalExamEditOpen(true)}
        >
          Fix final exam grade
        </Button>
      );
    }

    return (
      <Link
        href={getManagerClassDetailRoute(classId)}
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Open class final exam
      </Link>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Missing grade data{student ? ` — ${student.full_name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Review missing task and final exam inputs blocking grade computation.
            </DialogDescription>
          </DialogHeader>

          {!student || missingItems.length === 0 ? (
            <EmptyState
              size="sm"
              icon={ClipboardListIcon}
              title="No missing data"
              description="No missing grade data for this student."
            />
          ) : (
            <div className="space-y-6">
              {taskItems.length > 0 ? (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Tasks</h3>
                  <div className="space-y-3">
                    {taskItems.map((item) => (
                      <div
                        key={`${item.kind}-${item.taskId ?? item.label}`}
                        className="rounded-xl border bg-muted/15 p-4"
                      >
                        <MissingItemBadge item={item} />
                        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-muted-foreground">Status</dt>
                            <dd className="font-medium">{formatStatus(item.status)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Grade</dt>
                            <dd className="font-medium tabular-nums">
                              {item.isYesNo
                                ? formatYesNoGrade(item.grade)
                                : formatGrade(item.grade)}
                            </dd>
                          </div>
                        </dl>
                        <div className="mt-3">{renderItemActions(item)}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {finalExamItems.length > 0 ? (
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Final exam</h3>
                  <div className="space-y-3">
                    {finalExamItems.map((item) => (
                      <div
                        key={`${item.kind}-${item.finalExamGradeId ?? item.label}`}
                        className="rounded-xl border bg-muted/15 p-4"
                      >
                        <MissingItemBadge item={item} />
                        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                          <div>
                            <dt className="text-muted-foreground">Status</dt>
                            <dd className="font-medium">{formatStatus(item.status)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground">Grade</dt>
                            <dd className="font-medium tabular-nums">
                              {formatGrade(item.grade)}
                            </dd>
                          </div>
                        </dl>
                        <div className="mt-3">{renderItemActions(item)}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {isTaskEditOpen && taskEditTarget ? (
        <EditStudentTaskSheet
          open
          onOpenChange={setIsTaskEditOpen}
          studentTask={taskEditTarget}
          maxGrade={taskEditItem?.maxGrade ?? null}
          isYesNo={taskEditItem?.isYesNo ?? false}
          dueDate={taskEditItem?.dueDate ?? null}
          readOnly={recordLocked}
          onUpdateStudentTask={() => {
            handleRefresh();
          }}
        />
      ) : null}

      {isFinalExamEditOpen && finalExamStudentGrade ? (
        <EditStudentFinalExamGradeSheet
          open
          onOpenChange={setIsFinalExamEditOpen}
          studentGrade={finalExamStudentGrade}
          maxGrade={finalExam?.max_grade ?? null}
          dueDate={finalExam?.due_date ?? null}
          readOnly={recordLocked}
          onStudentGradeUpdated={() => {
            handleRefresh();
          }}
        />
      ) : null}
    </>
  );
}
