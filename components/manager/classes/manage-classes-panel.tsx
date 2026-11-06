"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadClassesPageAction,
  loadStudentsWithoutActiveClassAction,
} from "@/app/manager/classes/actions";
import {
  ChartColumnIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GraduationCapIcon,
  PlusIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddClassDialog } from "@/components/manager/classes/add-class-dialog";
import { ClassCard } from "@/components/manager/classes/class-card";
import {
  ClassStatsDialog,
  type ClassStats,
} from "@/components/manager/classes/class-stats-dialog";
import { MANAGER_CARD_GRID_CLASS_NAME } from "@/components/manager/shared/grid-card";
import { StudentsWithoutActiveClassCard } from "@/components/manager/shared/students-without-active-class-card";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CLASS_STATUSES,
  CLASS_STATUS_VALUES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import {
  MANAGER_CLASS_STATUS_DOT_CLASSES,
  MANAGER_CLASS_STATUS_LABELS,
  MANAGER_CLASS_STATUS_TAB_CLASSES,
} from "@/lib/constants/manager-class-display";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import { showErrorToast } from "@/lib/toast";
import type {
  ManagerClassesListData,
  ManagerClassesListQuery,
  ManagerClassRow,
  ManagerClassStatusCounts,
} from "@/types/manager-class-list";
import type { ManagerStudentWithoutActiveClassRow } from "@/types/manager-student";

const PAGE_SIZE = 40;
const STATUS_FILTER_ALL = "all";

type StatusFilterValue = ClassStatusValue | typeof STATUS_FILTER_ALL;

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage !== undefined && page - previousPage > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  });

  return result;
}

function listQueryKey(query: { status: StatusFilterValue; page: number }) {
  return `${query.status}|${query.page}`;
}

function buildListQuery(input: {
  status: StatusFilterValue;
  page: number;
  pageSize: number;
}): ManagerClassesListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    status: input.status === STATUS_FILTER_ALL ? null : input.status,
  };
}

type ManageClassesPanelProps = {
  initialData: ManagerClassesListData;
};

export function ManageClassesPanel({ initialData }: ManageClassesPanelProps) {
  const [classes, setClasses] = useState<ManagerClassRow[]>(
    initialData.classes
  );
  const [totalCount, setTotalCount] = useState(initialData.totalCount);  const [statusCounts, setStatusCounts] = useState<ManagerClassStatusCounts>(
    initialData.statusCounts
  );
  const [isLoading, setIsLoading] = useState(false);
  const pageSize = initialData.pageSize || PAGE_SIZE;
  const [studentsWithoutActiveClass, setStudentsWithoutActiveClass] = useState<
    ManagerStudentWithoutActiveClassRow[]
  >([]);
  const [
    studentsWithoutActiveClassLoaded,
    setStudentsWithoutActiveClassLoaded,
  ] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void loadStudentsWithoutActiveClassAction().then((rows) => {
      if (cancelled) {
        return;
      }

      setStudentsWithoutActiveClass(rows);
      setStudentsWithoutActiveClassLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilterValue>(STATUS_FILTER_ALL);
  const [currentPage, setCurrentPage] = useState(initialData.page);
  const loadedKeyRef = useRef(
    listQueryKey({ status: STATUS_FILTER_ALL, page: initialData.page })
  );

  useEffect(() => {
    const key = listQueryKey({ status: statusFilter, page: currentPage });
    if (key === loadedKeyRef.current) {
      return;
    }
    loadedKeyRef.current = key;
    let cancelled = false;
    setIsLoading(true);
    void loadClassesPageAction(
      buildListQuery({ status: statusFilter, page: currentPage, pageSize })
    ).then((data) => {
      if (cancelled) {
        return;
      }
      setIsLoading(false);
      if (!data) {
        showErrorToast("Unable to load classes.");
        return;
      }
      setClasses(data.classes);
      setTotalCount(data.totalCount);
      setStatusCounts(data.statusCounts);
    });
    return () => {
      cancelled = true;
    };
  }, [currentPage, pageSize, statusFilter]);

  const stats = useMemo<ClassStats>(
    () => ({
      total: CLASS_STATUS_VALUES.reduce(
        (sum, status) => sum + (statusCounts[status] ?? 0),
        0
      ),
      inProgress: statusCounts[CLASS_STATUSES.IN_PROGRESS] ?? 0,
      scheduled: statusCounts[CLASS_STATUSES.SCHEDULED] ?? 0,
      done: statusCounts[CLASS_STATUSES.DONE] ?? 0,
      onHold:
        (statusCounts[CLASS_STATUSES.PAUSED] ?? 0) +
        (statusCounts[CLASS_STATUSES.STOPPED] ?? 0),
      studentsWithoutActiveClass: studentsWithoutActiveClassLoaded
        ? studentsWithoutActiveClass.length
        : null,
    }),
    [statusCounts, studentsWithoutActiveClass, studentsWithoutActiveClassLoaded]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, totalCount);

  const handleStatusFilterChange = (value: StatusFilterValue) => {
    if (value === statusFilter) {
      return;
    }
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const statusTabs: Array<{ value: StatusFilterValue; count: number }> = [
    { value: STATUS_FILTER_ALL, count: stats.total },
    ...CLASS_STATUS_VALUES.map((status) => ({
      value: status,
      count: statusCounts[status] ?? 0,
    })),
  ];

  const handleCreateClass = () => {
    // Reset to the "All" tab and reload page 1 so the new class (newest first)
    // and the global status counts come from the server.
    setStatusFilter(STATUS_FILTER_ALL);
    setCurrentPage(1);
    loadedKeyRef.current = listQueryKey({ status: STATUS_FILTER_ALL, page: 1 });
    setIsLoading(true);
    void loadClassesPageAction(
      buildListQuery({ status: STATUS_FILTER_ALL, page: 1, pageSize })
    ).then((data) => {
      setIsLoading(false);
      if (!data) {
        showErrorToast("Unable to load classes.");
        return;
      }
      setClasses(data.classes);
      setTotalCount(data.totalCount);
      setStatusCounts(data.statusCounts);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title="Manage classes" />
      <div className="flex flex-col-reverse items-center gap-3 @4xl/panel:grid @4xl/panel:grid-cols-[1fr_auto_1fr]">
        <div aria-hidden className="hidden @4xl/panel:block" />
        <div
          role="tablist"
          aria-label="Filter classes by status"
          className="flex w-fit max-w-full flex-wrap items-center justify-center gap-1.5 rounded-xl border bg-card p-1.5 shadow-xs"
        >
          {statusTabs.map((tab) => {
            const isActive = tab.value === statusFilter;
            const isAll = tab.value === STATUS_FILTER_ALL;
            const tabClasses = isAll
              ? null
              : MANAGER_CLASS_STATUS_TAB_CLASSES[tab.value as ClassStatusValue];

            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleStatusFilterChange(tab.value)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-lg border border-transparent px-4 text-sm font-medium",
                  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                  isAll
                    ? isActive
                      ? "border-foreground/20 bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    : isActive
                      ? tabClasses?.active
                      : tabClasses?.idle
                )}
              >
                {isAll ? null : (
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      MANAGER_CLASS_STATUS_DOT_CLASSES[
                        tab.value as ClassStatusValue
                      ]
                    )}
                  />
                )}
                {isAll
                  ? "All"
                  : MANAGER_CLASS_STATUS_LABELS[tab.value as ClassStatusValue]}
                <span
                  className={cn(
                    "text-sm tabular-nums",
                    isActive ? "opacity-90" : "opacity-60"
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 self-end @4xl/panel:self-auto @4xl/panel:justify-self-end">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="View class statistics"
                  onClick={() => setIsStatsOpen(true)}
                >
                  <ChartColumnIcon />
                </Button>
              }
            />
            <TooltipContent>Class statistics</TooltipContent>
          </Tooltip>
          <Can permission={PERMISSIONS.CLASSES_CREATE}>
            <Button type="button" onClick={() => setIsAddOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Add class
            </Button>
          </Can>
        </div>
      </div>

      {isAddOpen ? (
        <AddClassDialog
          open
          onOpenChange={setIsAddOpen}
          onClassCreated={handleCreateClass}
        />
      ) : null}

      <ClassStatsDialog
        open={isStatsOpen}
        onOpenChange={setIsStatsOpen}
        stats={stats}
      />

      <div className="flex flex-col gap-6">
        {classes.length === 0 ? (
          <EmptyState
            icon={GraduationCapIcon}
            title={
              stats.total === 0 || statusFilter === STATUS_FILTER_ALL
                ? "No classes yet"
                : `No ${MANAGER_CLASS_STATUS_LABELS[statusFilter].toLowerCase()} classes`
            }
            description={
              stats.total === 0
                ? "Create one to get started."
                : "No classes have this status right now."
            }
          />
        ) : (
          <div
            className={cn(
              MANAGER_CARD_GRID_CLASS_NAME,
              isLoading && "opacity-60"
            )}
          >
            {classes.map((classRow) => (
              <ClassCard key={classRow.id} classRow={classRow} />
            ))}
          </div>
        )}

        {totalCount > 0 ? (
          <div className="flex flex-col gap-3 border-t pt-4 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {rangeStart}–{rangeEnd} of {totalCount}
            </p>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={isLoading || safeCurrentPage <= 1}
                onClick={() => setCurrentPage((page) => page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeftIcon />
              </Button>

              {pageNumbers.map((page, index) =>
                page === "ellipsis" ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-sm text-muted-foreground"
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={page}
                    type="button"
                    disabled={isLoading}
                    variant={page === safeCurrentPage ? "default" : "outline"}
                    size="icon-sm"
                    className="min-w-7"
                    onClick={() => setCurrentPage(page)}
                    aria-label={`Page ${page}`}
                    aria-current={page === safeCurrentPage ? "page" : undefined}
                  >
                    {page}
                  </Button>
                )
              )}

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                disabled={isLoading || safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((page) => page + 1)}
                aria-label="Next page"
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <StudentsWithoutActiveClassCard
        students={studentsWithoutActiveClass}
        description="Students who are not enrolled in any in-progress class."
        storageKey={
          COLLAPSIBLE_SECTION_STORAGE_KEYS.CLASSES_STUDENTS_WITHOUT_ACTIVE_CLASS
        }
        defaultOpen
      />
    </div>
  );
}
