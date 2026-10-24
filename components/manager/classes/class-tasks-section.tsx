"use client";

import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";
import { DownloadIcon, PlusIcon } from "lucide-react";
import { importSubjectTasksForClassAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { AddClassTaskDialog } from "@/components/manager/classes/add-class-task-dialog";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import { SESSION_TASK_TABLE_LIMITS } from "@/lib/constants/manager-class-session-detail-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerClassTaskDetailRoute } from "@/lib/constants/routes";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ImportSubjectTasksActionState,
  ManagerClassTaskRow,
} from "@/types/manager-class-session-detail";

const initialImportState: ImportSubjectTasksActionState = {};

type ClassTasksSectionProps = {
  classId: string;
  className: string;
  tasks: ManagerClassTaskRow[];
  hasSubject?: boolean;
  hasComputedGrades?: boolean;
  /** Override task row detail links (defaults to manager routes). */
  getTaskDetailHref?: (taskId: string) => string;
};

function TruncatedCell({
  value,
  maxLength,
  className,
}: {
  value: string;
  maxLength: number;
  className?: string;
}) {
  const { display, isTruncated } = truncateText(value, maxLength);

  if (!isTruncated) {
    return <span className={cn("block truncate", className)}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn("block cursor-default truncate", className)}
            tabIndex={0}
          />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

function formatDateCell(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(value), "MMM d, yyyy");
}

function sortTasks(tasks: ManagerClassTaskRow[]) {
  return [...tasks].sort((left, right) => {
    const orderCompare = left.sort_order - right.sort_order;
    if (orderCompare !== 0) {
      return orderCompare;
    }

    return (
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );
  });
}

export function ClassTasksSection({
  classId,
  className,
  tasks: initialTasks,
  hasSubject = true,
  hasComputedGrades = false,
  getTaskDetailHref,
}: ClassTasksSectionProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [importState, importAction, isImportPending] = useFormActionState(
    importSubjectTasksForClassAction,
    initialImportState
  );

  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
  }

  useActionStateToast(importState, isImportPending);

  useActionStateSuccess(
    importState,
    isImportPending,
    (nextState) => {
      const imported = nextState.tasks ?? [];
      if (imported.length === 0) {
        return;
      }

      setTasks((current) => {
        const existingIds = new Set(current.map((row) => row.id));
        return sortTasks([
          ...current,
          ...imported.filter((row) => !existingIds.has(row.id)),
        ]);
      });
    },
    (nextState) => Boolean(nextState.success)
  );

  function handleImport() {
    const formData = new FormData();
    formData.set("class_id", classId);
    importAction(formData);
  }

  const importDisabledReason = hasComputedGrades
    ? CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR
    : !hasSubject
      ? "This class has no subject to import tasks from."
      : undefined;

  return (
    <>
      <AddClassTaskDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        classId={classId}
        className={className}
        onCreateTask={(task) => {
          setTasks((current) =>
            sortTasks([task, ...current.filter((row) => row.id !== task.id)])
          );
        }}
      />

      <ClassTabCollapsibleSection
        title="Tasks"
        description={`All tasks for ${className}.`}
        storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.CLASS_DETAILS_TASKS}
        defaultOpen
        action={
          <Can permission={PERMISSIONS.TASKS_CREATE}>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {importDisabledReason ? (
                <Tooltip>
                  <TooltipTrigger
                    render={<span className="inline-flex" tabIndex={0} />}
                  >
                    <Button type="button" variant="outline" disabled>
                      <DownloadIcon data-icon="inline-start" />
                      Import from subject
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{importDisabledReason}</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isImportPending}
                  onClick={handleImport}
                >
                  {isImportPending ? (
                    <InlineSpinner />
                  ) : (
                    <DownloadIcon data-icon="inline-start" />
                  )}
                  Import from subject
                </Button>
              )}

              {hasComputedGrades ? (
                <Tooltip>
                  <TooltipTrigger
                    render={<span className="inline-flex" tabIndex={0} />}
                  >
                    <Button type="button" disabled>
                      <PlusIcon data-icon="inline-start" />
                      Create task
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button type="button" onClick={() => setIsAddOpen(true)}>
                  <PlusIcon data-icon="inline-start" />
                  Create task
                </Button>
              )}
            </div>
          </Can>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Period (days)</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Due date</th>
                <th className="px-4 py-3 font-medium">Max grade</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No tasks linked to this class yet.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b last:border-b-0 transition-colors duration-150 hover:bg-primary/8"
                  >
                    <td className="max-w-[12rem] px-4 py-3">
                      <Link
                        href={
                          getTaskDetailHref?.(task.id) ??
                          getManagerClassTaskDetailRoute(classId, task.id)
                        }
                        prefetch={false}
                        className="block font-medium text-primary underline-offset-4 hover:underline"
                        aria-label={`View task ${task.title}`}
                      >
                        <TruncatedCell
                          value={task.title}
                          maxLength={SESSION_TASK_TABLE_LIMITS.title}
                        />
                      </Link>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {task.period}
                    </td>
                    <td className="max-w-[16rem] px-4 py-3 text-muted-foreground">
                      <TruncatedCell
                        value={task.description ?? "—"}
                        maxLength={SESSION_TASK_TABLE_LIMITS.description}
                      />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex w-fit rounded-md px-2 py-0.5 text-xs font-medium",
                          task.started
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {task.started ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateCell(task.due_date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums">
                      {task.max_grade ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ClassTabCollapsibleSection>
    </>
  );
}
