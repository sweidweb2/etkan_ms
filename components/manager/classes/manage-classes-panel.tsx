"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadClassesPageAction,
  loadStudentsWithoutActiveClassAction,
} from "@/app/manager/classes/actions";
import {
  ChartColumnIcon,
  GraduationCapIcon,
  PlusIcon,
  UserRoundXIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddClassDialog } from "@/components/manager/classes/add-class-dialog";
import { ClassCard } from "@/components/manager/classes/class-card";
import {
  ClassStatsDialog,
  type ClassStats,
} from "@/components/manager/classes/class-stats-dialog";
import { StudentsWithoutActiveClassDialog } from "@/components/manager/classes/students-without-active-class-dialog";
import { MANAGER_CARD_GRID_CLASS_NAME } from "@/components/manager/shared/grid-card";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getPageNumbers } from "@/lib/pagination/page-numbers";
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
const DEFAULT_STATUS_FILTER = CLASS_STATUSES.IN_PROGRESS;

type StatusFilterValue = ClassStatusValue | typeof STATUS_FILTER_ALL;

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
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [statusCounts, setStatusCounts] = useState<ManagerClassStatusCounts>(
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
  const [isStudentsOpen, setIsStudentsOpen] = useState(false);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilterValue>(DEFAULT_STATUS_FILTER);
  const [currentPage, setCurrentPage] = useState(initialData.page);
  const loadedKeyRef = useRef(
    listQueryKey({ status: DEFAULT_STATUS_FILTER, page: initialData.page })
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

  const handleStatusFilterChange = (value: string | null) => {
    const next = (value ?? DEFAULT_STATUS_FILTER) as StatusFilterValue;
    if (next === statusFilter) {
      return;
    }
    setStatusFilter(next);
    setCurrentPage(1);
  };

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
      <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Students without an active class"
                  onClick={() => setIsStudentsOpen(true)}
                >
                  <UserRoundXIcon />
                </Button>
              }
            />
            <TooltipContent>Students without an active class</TooltipContent>
          </Tooltip>
          <Can permission={PERMISSIONS.CLASSES_CREATE}>
            <Button type="button" onClick={() => setIsAddOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Add class
            </Button>
          </Can>
        </div>

        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger
            className="w-full @lg/panel:w-48"
            aria-label="Filter classes by status"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value={STATUS_FILTER_ALL}>
              All statuses ({stats.total})
            </SelectItem>
            {CLASS_STATUS_VALUES.map((status) => (
              <SelectItem key={status} value={status}>
                {MANAGER_CLASS_STATUS_LABELS[status]} (
                {statusCounts[status] ?? 0})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <StudentsWithoutActiveClassDialog
        open={isStudentsOpen}
        onOpenChange={setIsStudentsOpen}
        students={studentsWithoutActiveClass}
        isLoading={!studentsWithoutActiveClassLoaded}
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

        {totalPages > 1 ? (
          <nav
            aria-label="Class pages"
            className="flex items-center justify-center gap-1"
          >
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
          </nav>
        ) : null}
      </div>
    </div>
  );
}
