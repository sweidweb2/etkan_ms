"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  DownloadIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react";
import { importSubjectTasksForClassAction } from "@/app/manager/classes/actions";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { AddClassTaskDialog } from "@/components/manager/classes/add-class-task-dialog";
import { ClassTabCollapsibleSection } from "@/components/manager/students/class-tab-collapsible-section";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LibraryCard } from "@/components/ui/library-card";
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
import { YES_NO_TASK_LABEL } from "@/lib/constants/task-yes-no";
import { formatTaskMaxGrade } from "@/lib/format/format-task-grade";
import { CLASS_COMPUTED_GRADES_STRUCTURE_LOCKED_ERROR } from "@/lib/manager/class-grades-access";
import { getPageNumbers } from "@/lib/pagination/page-numbers";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ImportSubjectTasksActionState,
  ManagerClassTaskRow,
} from "@/types/manager-class-session-detail";

const TASK_CARDS_PAGE_SIZE = 15;
const TASK_CARDS_MAX_PAGES = 50;

const initialImportState: ImportSubjectTasksActionState = {};

type ClassTasksSectionProps = {
  classId: string;
  className: string;
  tasks: ManagerClassTaskRow[];
  hasSubject?: boolean;
  hasComputedGrades?: boolean;
  /** Override task row detail links (defaults to manager routes). */
  getTaskDetailHref?: (taskId: string) => string;
  /** `cards` = library-style grid (teacher); `table` = manager default. */
  layout?: "table" | "cards";
  /** When false, section stays open with no expand/collapse controls. */
  collapsible?: boolean;
};

function formatTaskEyebrow(task: ManagerClassTaskRow) {
  const dateValue = task.due_date ?? task.started_at ?? task.created_at;
  const date = new Date(dateValue);

  if (task.due_date) {
    if (isToday(date)) {
      return "Due today";
    }
    if (isYesterday(date)) {
      return "Due yesterday";
    }
    return `Due ${format(date, "MMM d")}`;
  }

  if (task.started_at) {
    if (isToday(date)) {
      return "Started today";
    }
    return `Started ${format(date, "MMM d")}`;
  }

  if (isToday(date)) {
    return "Created today";
  }

  return format(date, "MMM d");
}

const CARD_GLOWS = ["lavender", "blue", "mint"] as const;

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

/** Cards: pin started tasks first, then normal order within each group. */
function sortTasksForCards(tasks: ManagerClassTaskRow[]) {
  return [...tasks].sort((left, right) => {
    if (left.started !== right.started) {
      return left.started ? -1 : 1;
    }

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
  layout = "table",
  collapsible = true,
}: ClassTasksSectionProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [prevInitialTasks, setPrevInitialTasks] = useState(initialTasks);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [importState, importAction, isImportPending] = useFormActionState(
    importSubjectTasksForClassAction,
    initialImportState
  );

  if (initialTasks !== prevInitialTasks) {
    setPrevInitialTasks(initialTasks);
    setTasks(initialTasks);
    setCurrentPage(1);
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
      setCurrentPage(1);
    },
    (nextState) => Boolean(nextState.success)
  );

  const sortedTasks = useMemo(
    () =>
      layout === "cards" ? sortTasksForCards(tasks) : sortTasks(tasks),
    [layout, tasks]
  );
  const cappedTasks = useMemo(
    () => sortedTasks.slice(0, TASK_CARDS_PAGE_SIZE * TASK_CARDS_MAX_PAGES),
    [sortedTasks]
  );
  const totalPages = Math.max(
    1,
    Math.min(
      TASK_CARDS_MAX_PAGES,
      Math.ceil(cappedTasks.length / TASK_CARDS_PAGE_SIZE)
    )
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageTasks = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * TASK_CARDS_PAGE_SIZE;
    return cappedTasks.slice(startIndex, startIndex + TASK_CARDS_PAGE_SIZE);
  }, [cappedTasks, safeCurrentPage]);
  const pageNumbers = useMemo(
    () => getPageNumbers(safeCurrentPage, totalPages),
    [safeCurrentPage, totalPages]
  );
  const rangeStart =
    cappedTasks.length === 0
      ? 0
      : (safeCurrentPage - 1) * TASK_CARDS_PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * TASK_CARDS_PAGE_SIZE,
    cappedTasks.length
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

  const createActions = (
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
  );

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
          setCurrentPage(1);
        }}
      />

      {layout === "cards" ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight">Tasks</h2>
              <p className="text-sm text-muted-foreground">
                All tasks for {className}.
              </p>
            </div>
            {createActions}
          </div>

          {cappedTasks.length === 0 ? (
            <EmptyState
              size="sm"
              icon={ClipboardListIcon}
              title="No tasks yet"
              description="No tasks linked to this class yet."
            />
          ) : (
            <>
              <div className="grid gap-3 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-3">
                {pageTasks.map((task, index) => {
                  const href =
                    getTaskDetailHref?.(task.id) ??
                    getManagerClassTaskDetailRoute(classId, task.id);
                  const glowIndex =
                    (safeCurrentPage - 1) * TASK_CARDS_PAGE_SIZE + index;

                  return (
                    <LibraryCard
                      key={task.id}
                      href={href}
                      eyebrow={formatTaskEyebrow(task)}
                      title={task.title}
                      badge={task.started ? "Started" : "Not started"}
                      coverBadge={task.started ? "Started" : undefined}
                      meta={{
                        icon: SparklesIcon,
                        label: task.is_yes_no
                          ? `${YES_NO_TASK_LABEL} · ${task.period}d`
                          : task.max_grade != null
                            ? `${task.max_grade} max · ${task.period}d`
                            : `${task.period} day period`,
                      }}
                      previewIcon={ClipboardListIcon}
                      glow={
                        task.started
                          ? "mint"
                          : CARD_GLOWS[glowIndex % CARD_GLOWS.length]
                      }
                    />
                  );
                })}
              </div>

              <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {rangeStart}–{rangeEnd} of {cappedTasks.length}
                  {sortedTasks.length > cappedTasks.length
                    ? ` (capped at ${TASK_CARDS_PAGE_SIZE * TASK_CARDS_MAX_PAGES})`
                    : null}
                </p>
                {totalPages > 1 ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={safeCurrentPage <= 1}
                      onClick={() =>
                        setCurrentPage((page) => Math.max(1, page - 1))
                      }
                      aria-label="Previous page"
                    >
                      <ChevronLeftIcon />
                    </Button>
                    {pageNumbers.map((page, index) =>
                      page === "ellipsis" ? (
                        <span
                          key={`ellipsis-${index}`}
                          className="px-1 text-muted-foreground"
                        >
                          …
                        </span>
                      ) : (
                        <Button
                          key={page}
                          type="button"
                          variant={
                            page === safeCurrentPage ? "default" : "outline"
                          }
                          size="icon-sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      )
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      disabled={safeCurrentPage >= totalPages}
                      onClick={() =>
                        setCurrentPage((page) =>
                          Math.min(totalPages, page + 1)
                        )
                      }
                      aria-label="Next page"
                    >
                      <ChevronRightIcon />
                    </Button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>
      ) : (
        <ClassTabCollapsibleSection
          title="Tasks"
          description={`All tasks for ${className}.`}
          storageKey={COLLAPSIBLE_SECTION_STORAGE_KEYS.CLASS_DETAILS_TASKS}
          defaultOpen
          collapsible={collapsible}
          action={createActions}
        >
          {tasks.length === 0 ? (
            <div className="px-4 py-3">
              <EmptyState
                size="sm"
                icon={ClipboardListIcon}
                title="No tasks yet"
                description="No tasks linked to this class yet."
              />
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="w-12 px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Period (days)</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Due date</th>
                  <th className="px-4 py-3 font-medium">Max grade</th>
                </tr>
              </thead>
              <tbody>
                  {tasks.map((task, index) => (
                    <tr
                      key={task.id}
                      className="border-b last:border-b-0 transition-colors duration-150 hover:bg-primary/8"
                    >
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {index + 1}
                      </td>
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
                        {formatTaskMaxGrade({
                          maxGrade: task.max_grade,
                          isYesNo: task.is_yes_no,
                        })}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          )}
        </ClassTabCollapsibleSection>
      )}
    </>
  );
}
