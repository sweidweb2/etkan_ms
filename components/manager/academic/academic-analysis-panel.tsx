"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  BookOpenIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  UserCheckIcon,
  UserXIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { loadAcademicAnalysisStudentsPageAction } from "@/app/(panels)/manager/academic-analysis/actions";
import { Can } from "@/components/auth/can";
import { AcademicClassSessionProgressBars } from "@/components/manager/academic/academic-class-session-progress-bars";
import { AnalyticsStatCard } from "@/components/manager/accounting/analytics-stat-card";
import { AnalyticsChartCard } from "@/components/manager/analytics/analytics-chart-card";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MANAGER_STUDENT_STATUS_BADGE_CLASSES,
  MANAGER_STUDENT_STATUS_LABELS,
} from "@/lib/constants/manager-student-display";
import {
  STUDENT_STATUS_VALUES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerStudentDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerAcademicAnalysisData } from "@/types/manager-academic-analysis";

const STATUS_FILTER_ALL = "all";
const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const COLUMN_LIMITS = {
  fullName: 24,
  username: 20,
} as const;

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

type AcademicAnalysisPanelProps = {
  data: ManagerAcademicAnalysisData;
};

export function AcademicAnalysisPanel({ data }: AcademicAnalysisPanelProps) {
  const [isPending, startTransition] = useTransition();
  const skipNextFetch = useRef(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(data.studentsPage.page);
  const [students, setStudents] = useState(data.studentsPage.students);
  const [total, setTotal] = useState(data.studentsPage.total);

  const appliedSearch = useRef("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (appliedSearch.current === searchQuery) {
        return;
      }
      appliedSearch.current = searchQuery;
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }

    let cancelled = false;
    startTransition(async () => {
      const pageData = await loadAcademicAnalysisStudentsPageAction({
        page: currentPage,
        pageSize,
        status: statusFilter,
        search: debouncedSearch,
      });
      if (cancelled) {
        return;
      }
      setStudents(pageData.students);
      setTotal(pageData.total);
      setCurrentPage(pageData.page);
    });

    return () => {
      cancelled = true;
    };
  }, [currentPage, pageSize, statusFilter, debouncedSearch]);

  const hasActiveFilters =
    statusFilter !== STATUS_FILTER_ALL || debouncedSearch.trim().length > 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart = total === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, total);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleStatusFilterChange = (value: string | null) => {
    if (!value) return;
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) return;
    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <PanelPageHeader title="Academic analysis" />

        <div className="grid gap-4 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-4">
          <AnalyticsStatCard
            label="Classes"
            value={String(data.classCount)}
            description="All classes in the catalog"
            icon={BookOpenIcon}
            iconClassName="text-sky-600 dark:text-sky-400"
          />
          <AnalyticsStatCard
            label="Active students"
            value={String(data.studentCounts.active)}
            description="Students marked active"
            icon={UserCheckIcon}
            iconClassName="text-emerald-600 dark:text-emerald-400"
          />
          <AnalyticsStatCard
            label="Inactive students"
            value={String(data.studentCounts.inactive)}
            description="Students marked inactive"
            icon={UserXIcon}
            iconClassName="text-amber-600 dark:text-amber-400"
          />
          <AnalyticsStatCard
            label="Total students"
            value={String(data.studentCounts.total)}
            description="All student profiles"
            icon={UsersIcon}
            iconClassName="text-violet-600 dark:text-violet-400"
          />
        </div>

        <AnalyticsChartCard
          title="Class session progress"
          description="Per-class bars: sessions completed versus the subject planned count."
        >
          <AcademicClassSessionProgressBars
            classes={data.classSessionSeries}
          />
        </AnalyticsChartCard>

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-end @lg/panel:justify-between">
            <div>
              <h2 className="text-sm font-medium">Students</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Read-only roster for status overview.
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 @lg/panel:w-auto @lg/panel:flex-row @lg/panel:items-center">
              <div className="relative min-w-0 flex-1 @lg/panel:w-64">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name or username…"
                  className="pl-8"
                  aria-label="Search students"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger
                  className="w-full @lg/panel:w-44"
                  aria-label="Filter by status"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
                  {STUDENT_STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {
                        MANAGER_STUDENT_STATUS_LABELS[
                          status as StudentStatusValue
                        ]
                      }
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div
            className={cn(
              "overflow-hidden rounded-xl border",
              isPending && "opacity-70"
            )}
            aria-busy={isPending}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Username</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        {hasActiveFilters
                          ? "No students match your filters."
                          : "No students yet."}
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr
                        key={student.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="max-w-[12rem] px-4 py-3 font-medium">
                          <Can
                            permission={PERMISSIONS.STUDENTS_VIEW}
                            fallback={
                              <TruncatedCell
                                value={student.full_name}
                                maxLength={COLUMN_LIMITS.fullName}
                              />
                            }
                          >
                            <Link
                              prefetch={false}
                              href={getManagerStudentDetailRoute(student.id)}
                              className="hover:underline"
                            >
                              <TruncatedCell
                                value={student.full_name}
                                maxLength={COLUMN_LIMITS.fullName}
                              />
                            </Link>
                          </Can>
                        </td>
                        <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                          <TruncatedCell
                            value={student.username || "—"}
                            maxLength={COLUMN_LIMITS.username}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                              MANAGER_STUDENT_STATUS_BADGE_CLASSES[
                                student.status
                              ]
                            )}
                          >
                            {MANAGER_STUDENT_STATUS_LABELS[student.status]}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {total}
                </span>
                <span aria-hidden="true">·</span>
                <div className="flex items-center gap-2">
                  <span>Rows</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={handlePageSizeChange}
                  >
                    <SelectTrigger
                      size="sm"
                      className="w-16"
                      aria-label="Rows per page"
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
                  disabled={isPending || safeCurrentPage <= 1}
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
                      disabled={isPending || page === safeCurrentPage}
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
                  disabled={isPending || safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((page) => page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
}
