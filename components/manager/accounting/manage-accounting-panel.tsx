"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  BarChart3Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
} from "lucide-react";
import { StudentSemesterStatusBadge } from "@/components/manager/students/student-semester-status-badge";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MANAGER_STUDENT_SEMESTER_TABLE_LIMITS } from "@/lib/constants/manager-student-semester-display";
import { STUDENT_SEMESTER_STATUSES } from "@/lib/constants/manager-student-semester-status";
import {
  getManagerAccountingSemesterOptions,
  getManagerAccountingStudentsPreview,
} from "@/lib/manager/get-manager-accounting-students-preview";
import { getManagerStudentAccountDetailRoute, ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerAccountingStudentRow } from "@/types/manager-student-semester";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const SEMESTER_FILTER_ALL = "all";
const BALANCE_FILTER_ALL = "all";
const BALANCE_FILTER_DUE = "balance_due";
const BALANCE_FILTER_PAID = "paid_in_full";
const ACCOUNTING_ROW_HOVER_CLASS =
  "cursor-pointer border-b last:border-b-0 transition-all duration-150 hover:bg-primary/10 hover:shadow-[inset_4px_0_0_0_var(--primary)] active:bg-primary/15 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

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

function matchesSearch(row: ManagerAccountingStudentRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [row.full_name, row.email, row.phone ?? "", row.semester_name ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function ManageAccountingPanel() {
  const router = useRouter();
  const semesterOptions = useMemo(() => getManagerAccountingSemesterOptions(), []);
  const [students] = useState(() => getManagerAccountingStudentsPreview());
  const [searchQuery, setSearchQuery] = useState("");
  const [semesterFilter, setSemesterFilter] = useState<string>(SEMESTER_FILTER_ALL);
  const [balanceFilter, setBalanceFilter] = useState<string>(BALANCE_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(
    () => ({
      total: students.length,
      active: students.filter(
        (row) => row.enrollment_status === STUDENT_SEMESTER_STATUSES.ACTIVE
      ).length,
      pending: students.filter(
        (row) => row.enrollment_status === STUDENT_SEMESTER_STATUSES.PENDING
      ).length,
      unassigned: students.filter((row) => row.semester_id === null).length,
      balanceDue: students.filter((row) => (row.balance_due ?? 0) > 0).length,
    }),
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((row) => {
      const matchesSemester =
        semesterFilter === SEMESTER_FILTER_ALL ||
        (semesterFilter === "unassigned"
          ? row.semester_id === null
          : row.semester_id === semesterFilter);
      const matchesBalance =
        balanceFilter === BALANCE_FILTER_ALL ||
        (balanceFilter === BALANCE_FILTER_DUE
          ? (row.balance_due ?? 0) > 0
          : (row.balance_due ?? 0) <= 0);

      return matchesSemester && matchesBalance && matchesSearch(row, searchQuery);
    });
  }, [balanceFilter, searchQuery, semesterFilter, students]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedStudents = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredStudents.slice(startIndex, startIndex + pageSize);
  }, [filteredStudents, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredStudents.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredStudents.length);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSemesterFilterChange = (value: string | null) => {
    setSemesterFilter(value ?? SEMESTER_FILTER_ALL);
    setCurrentPage(1);
  };

  const handleBalanceFilterChange = (value: string | null) => {
    setBalanceFilter(value ?? BALANCE_FILTER_ALL);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  };

  function handleOpenStudentAccount(studentProfileId: string) {
    router.push(getManagerStudentAccountDetailRoute(studentProfileId));
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Manage accounting
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Student semester enrollments for billing and access tracking.
            </p>
          </div>
          <Button
            render={<Link href={ROUTES.MANAGER_ACCOUNTING_ANALYSIS} />}
            nativeButton={false}
            variant="outline"
          >
            <BarChart3Icon data-icon="inline-start" />
            Analysis
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <UserStatCard
            label="Total students"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Active enrollments"
            value={stats.active}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Pending"
            value={stats.pending}
            accentClassName="border-l-amber-500"
          />
          <UserStatCard
            label="Balance due"
            value={stats.balanceDue}
            accentClassName="border-l-orange-500"
          />
          <UserStatCard
            label="Unassigned"
            value={stats.unassigned}
            accentClassName="border-l-rose-500"
          />
        </div>

        <Card className="py-0">
          <CardHeader className="border-b py-4">
            <CardTitle>Student enrollments</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-col gap-3 border-b px-4 py-4 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name or email…"
                  className="pl-8"
                  aria-label="Search students by name or email"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Select
                  value={balanceFilter}
                  onValueChange={handleBalanceFilterChange}
                >
                  <SelectTrigger
                    className="w-full sm:w-44"
                    aria-label="Filter by balance"
                  >
                    <SelectValue placeholder="All balances" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value={BALANCE_FILTER_ALL}>All balances</SelectItem>
                    <SelectItem value={BALANCE_FILTER_DUE}>Balance due</SelectItem>
                    <SelectItem value={BALANCE_FILTER_PAID}>Paid in full</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={semesterFilter}
                  onValueChange={handleSemesterFilterChange}
                >
                  <SelectTrigger
                    className="w-full sm:w-52"
                    aria-label="Filter by semester"
                  >
                    <SelectValue placeholder="All semesters" />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value={SEMESTER_FILTER_ALL}>All semesters</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {semesterOptions.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        {semester.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Semester</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No students match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((row) => (
                      <tr
                        key={`${row.student_profile_id}-${row.semester_id ?? "none"}`}
                        role="link"
                        tabIndex={0}
                        className={ACCOUNTING_ROW_HOVER_CLASS}
                        onClick={() =>
                          handleOpenStudentAccount(row.student_profile_id)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleOpenStudentAccount(row.student_profile_id);
                          }
                        }}
                        aria-label={`View account for ${row.full_name}`}
                      >
                        <td className="max-w-[12rem] px-4 py-3">
                          <TruncatedCell
                            value={row.full_name}
                            maxLength={MANAGER_STUDENT_SEMESTER_TABLE_LIMITS.fullName}
                            className="font-medium"
                          />
                        </td>
                        <td className="max-w-[14rem] px-4 py-3 text-muted-foreground">
                          <TruncatedCell
                            value={row.email}
                            maxLength={MANAGER_STUDENT_SEMESTER_TABLE_LIMITS.email}
                          />
                        </td>
                        <td className="max-w-[10rem] px-4 py-3 text-muted-foreground">
                          <TruncatedCell
                            value={row.semester_name ?? "—"}
                            maxLength={24}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {row.enrollment_status ? (
                            <StudentSemesterStatusBadge
                              status={row.enrollment_status}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {row.enrolled_at
                            ? format(new Date(row.enrolled_at), "MMM d, yyyy")
                            : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {filteredStudents.length}
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
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((page) => page + 1)}
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
