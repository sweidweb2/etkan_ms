"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { ConnectSemesterClassDialog } from "@/components/manager/phases/connect-semester-class-dialog";
import { SemesterClassCard } from "@/components/manager/phases/semester-class-card";
import { SemesterClassesProgressTrack } from "@/components/manager/phases/semester-classes-progress-track";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getManagerSemesterClassesPreview,
  getManagerUnlinkedSemesterClassesPreview,
} from "@/lib/constants/manager-semester-classes-mock";
import { CLASS_STATUSES, CLASS_STATUS_VALUES } from "@/lib/constants/manager-class-status";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import { printPageSection } from "@/lib/export/print-page-section";
import type { ManagerSemesterClassRow } from "@/types/manager-semester-class";

const PAGE_SIZE_OPTIONS = [3, 6, 9] as const;
const STATUS_FILTER_ALL = "all";

type SemesterClassesSectionProps = {
  semesterId: string;
  semesterName: string;
  onExportPdf?: () => void;
  onClassesCountChange?: (count: number) => void;
};

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

function matchesSearch(classRow: ManagerSemesterClassRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    classRow.name,
    classRow.id,
    classRow.subject_name,
    classRow.status,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function SemesterClassesSection({
  semesterId,
  semesterName,
  onExportPdf,
  onClassesCountChange,
}: SemesterClassesSectionProps) {
  const [classes, setClasses] = useState<ManagerSemesterClassRow[]>(() =>
    getManagerSemesterClassesPreview(semesterId)
  );
  const [availableClasses, setAvailableClasses] = useState<
    ManagerSemesterClassRow[]
  >(() => getManagerUnlinkedSemesterClassesPreview());
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    6
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    const handleAfterPrint = () => setIsExportingPdf(false);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    onExportPdf?.();
    printPageSection();
  };

  const stats = useMemo(
    () => ({
      total: classes.length,
      inProgress: classes.filter((row) => row.status === CLASS_STATUSES.IN_PROGRESS)
        .length,
      scheduled: classes.filter((row) => row.status === CLASS_STATUSES.SCHEDULED).length,
      onHold: classes.filter(
        (row) =>
          row.status === CLASS_STATUSES.PAUSED || row.status === CLASS_STATUSES.STOPPED
      ).length,
      enrollment: classes.reduce((sum, row) => sum + row.enrollment_count, 0),
    }),
    [classes]
  );

  const filteredClasses = useMemo(() => {
    return classes.filter((classRow) => {
      const matchesStatus =
        statusFilter === STATUS_FILTER_ALL || classRow.status === statusFilter;
      return matchesStatus && matchesSearch(classRow, searchQuery);
    });
  }, [classes, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedClasses = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredClasses.slice(startIndex, startIndex + pageSize);
  }, [filteredClasses, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredClasses.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredClasses.length);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value ?? STATUS_FILTER_ALL);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  };

  const handleConnectClass = (classRow: ManagerSemesterClassRow) => {
    const connectedClass: ManagerSemesterClassRow = {
      ...classRow,
      semester_id: semesterId,
    };

    setClasses((current) => {
      const next = [connectedClass, ...current];
      onClassesCountChange?.(next.length);
      return next;
    });
    setAvailableClasses((current) =>
      current.filter((row) => row.id !== classRow.id)
    );
    setCurrentPage(1);
  };

  return (
    <>
      <ConnectSemesterClassDialog
        open={isConnectOpen}
        onOpenChange={setIsConnectOpen}
        semesterName={semesterName}
        availableClasses={availableClasses}
        onConnectClass={handleConnectClass}
      />

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-4">
          <CardTitle>Classes</CardTitle>
          <CardDescription>
            Classes linked to this semester via classes.semester_id.
          </CardDescription>
          <CardAction className="self-center print:hidden">
            <Button type="button" onClick={() => setIsConnectOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Connect class
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <UserStatCard
              label="Total classes"
              value={stats.total}
              accentClassName="border-l-sky-500"
            />
            <UserStatCard
              label="In progress"
              value={stats.inProgress}
              accentClassName="border-l-sky-500"
            />
            <UserStatCard
              label="Scheduled"
              value={stats.scheduled}
              accentClassName="border-l-violet-500"
            />
            <UserStatCard
              label="On hold"
              value={stats.onHold}
              accentClassName="border-l-amber-500"
            />
            <UserStatCard
              label="Total enrollment"
              value={stats.enrollment}
              accentClassName="border-l-violet-500"
            />
          </div>

          <SemesterClassesProgressTrack
            classes={classes}
            semesterName={semesterName}
            onExportPdf={handleExportPdf}
            isExportingPdf={isExportingPdf}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center print:hidden">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search class name, subject, or status…"
                className="pl-8"
                aria-label="Search semester classes"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger
                className="w-full sm:w-40"
                aria-label="Filter by status"
              >
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
                {CLASS_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {MANAGER_CLASS_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paginatedClasses.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {classes.length === 0
                ? "No classes linked to this semester yet."
                : "No classes match your filters."}
            </p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 print:hidden">
                {paginatedClasses.map((classRow) => (
                  <SemesterClassCard key={classRow.id} classRow={classRow} />
                ))}
              </div>
              <div className="hidden gap-4 sm:grid-cols-2 xl:grid-cols-3 print:grid">
                {filteredClasses.map((classRow) => (
                  <SemesterClassCard
                    key={`print-${classRow.id}`}
                    classRow={classRow}
                  />
                ))}
              </div>
            </>
          )}

          {filteredClasses.length > 0 ? (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {filteredClasses.length}
                </span>
                <span aria-hidden="true">·</span>
                <div className="flex items-center gap-2">
                  <span>Cards</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-16"
                      aria-label="Cards per page"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {PAGE_SIZE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={String(option)}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={safeCurrentPage <= 1}
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
                      variant={page === safeCurrentPage ? "default" : "outline"}
                      size="icon-sm"
                      className="min-w-7"
                      onClick={() => setCurrentPage(page)}
                      aria-label={`Page ${page}`}
                      aria-current={
                        page === safeCurrentPage ? "page" : undefined
                      }
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
                  onClick={() => setCurrentPage((page) => page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
