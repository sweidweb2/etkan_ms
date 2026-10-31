"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  GraduationCapIcon,
  SearchIcon,
} from "lucide-react";
import { SubjectClassCard } from "@/components/manager/subjects/subject-class-card";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CLASS_STATUSES, CLASS_STATUS_VALUES } from "@/lib/constants/manager-class-status";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import type { ManagerSubjectClassRow } from "@/types/manager-subject-class";

const PAGE_SIZE_OPTIONS = [3, 6, 9] as const;
const STATUS_FILTER_ALL = "all";

type SubjectClassesSectionProps = {
  classes: ManagerSubjectClassRow[];
  subjectName: string;
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

function matchesSearch(classRow: ManagerSubjectClassRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return (
    classRow.name.toLowerCase().includes(normalizedQuery) ||
    classRow.id.toLowerCase().includes(normalizedQuery) ||
    classRow.status.toLowerCase().includes(normalizedQuery)
  );
}

export function SubjectClassesSection({
  classes,
  subjectName,
}: SubjectClassesSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    6
  );
  const [currentPage, setCurrentPage] = useState(1);

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

  return (
    <div className="flex flex-col gap-6">
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
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder="Search class name, ID, or status…"
              className="pl-8"
              aria-label="Search classes"
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
          <EmptyState
            size="sm"
            icon={classes.length === 0 ? GraduationCapIcon : SearchIcon}
            title={
              classes.length === 0 ? "No classes yet" : "No matching classes"
            }
            description={
              classes.length === 0
                ? "No classes created for this subject yet."
                : "No classes match your filters."
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {paginatedClasses.map((classRow) => (
              <SubjectClassCard
                key={classRow.id}
                classRow={classRow}
                subjectName={subjectName}
              />
            ))}
          </div>
        )}

        {filteredClasses.length > 0 ? (
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
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
    </div>
  );
}
