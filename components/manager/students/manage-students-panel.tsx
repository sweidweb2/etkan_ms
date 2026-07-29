"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddStudentDialog } from "@/components/manager/students/add-student-dialog";
import { StudentStatusBadge } from "@/components/manager/students/student-status-badge";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MANAGER_STUDENT_STATUS_LABELS } from "@/lib/constants/manager-student-display";
import {
  STUDENT_STATUSES,
  STUDENT_STATUS_VALUES,
  type StudentStatusValue,
} from "@/lib/constants/manager-student-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerStudentDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerStudentRow } from "@/types/manager-student";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const COLUMN_LIMITS = {
  fullName: 24,
  username: 20,
  email: 32,
  phone: 18,
} as const;

const STATUS_FILTER_ALL = "all";

const STUDENT_ROW_CLASS =
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

function matchesSearch(student: ManagerStudentRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const fullName = student.full_name.toLowerCase();
  const username = student.username?.toLowerCase() ?? "";
  const email = student.email.toLowerCase();
  const phone = student.phone?.toLowerCase() ?? "";

  return (
    fullName.includes(normalizedQuery) ||
    username.includes(normalizedQuery) ||
    email.includes(normalizedQuery) ||
    phone.includes(normalizedQuery)
  );
}

function formatBirthDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return format(new Date(`${value}T00:00:00`), "MMM d, yyyy");
}

function StudentViewAction({ student }: { student: ManagerStudentRow }) {
  return (
    <Link
      href={getManagerStudentDetailRoute(student.student_profile_id)}
      aria-label={`View ${student.full_name}`}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
    >
      <EyeIcon className="size-4" />
    </Link>
  );
}

export function ManageStudentsPanel({
  initialStudents,
}: {
  initialStudents: ManagerStudentRow[];
}) {
  const router = useRouter();
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);

  const students = initialStudents;

  const stats = useMemo(
    () => ({
      total: students.length,
      active: students.filter(
        (student) => student.status === STUDENT_STATUSES.ACTIVE
      ).length,
      inactive: students.filter(
        (student) => student.status === STUDENT_STATUSES.INACTIVE
      ).length,
      suspended: students.filter(
        (student) => student.status === STUDENT_STATUSES.SUSPENDED
      ).length,
    }),
    [students]
  );

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesStatus =
        statusFilter === STATUS_FILTER_ALL || student.status === statusFilter;
      return matchesStatus && matchesSearch(student, searchQuery);
    });
  }, [searchQuery, statusFilter, students]);

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

  const handleStudentCreated = () => {
    setCurrentPage(1);
    router.refresh();
  };

  const openStudentDetails = (student: ManagerStudentRow) => {
    router.push(getManagerStudentDetailRoute(student.student_profile_id));
  };

  const handleStudentRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    student: ManagerStudentRow
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openStudentDetails(student);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage students</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and create student accounts for your school.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UserStatCard
            label="Total students"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Active"
            value={stats.active}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Inactive"
            value={stats.inactive}
            accentClassName="border-l-muted-foreground"
          />
          <UserStatCard
            label="Suspended"
            value={stats.suspended}
            accentClassName="border-l-amber-500"
          />
        </div>

        <AddStudentDialog
          open={isAddStudentOpen}
          onOpenChange={setIsAddStudentOpen}
          onStudentCreated={handleStudentCreated}
        />

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Students</CardTitle>
            <CardAction className="self-center">
              <Can permission={PERMISSIONS.STUDENTS_CREATE}>
                <Button type="button" onClick={() => setIsAddStudentOpen(true)}>
                  <PlusIcon data-icon="inline-start" />
                  Add student
                </Button>
              </Can>
            </CardAction>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name, username, email, or phone…"
                  className="pl-8"
                  aria-label="Search students"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                <SelectTrigger
                  className="w-full sm:w-44"
                  aria-label="Filter by status"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
                  {STUDENT_STATUS_VALUES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {MANAGER_STUDENT_STATUS_LABELS[status as StudentStatusValue]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Full name</th>
                    <th className="px-4 py-3 font-medium">Username</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Birth date</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No students match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((student) => (
                      <tr
                        key={student.student_profile_id}
                        className={STUDENT_ROW_CLASS}
                        tabIndex={0}
                        role="link"
                        aria-label={`View details for ${student.full_name}`}
                        onClick={() => openStudentDetails(student)}
                        onKeyDown={(event) => handleStudentRowKeyDown(event, student)}
                      >
                        <td className="max-w-[12rem] px-4 py-3">
                          <TruncatedCell
                            value={student.full_name}
                            maxLength={COLUMN_LIMITS.fullName}
                          />
                        </td>
                        <td className="max-w-[10rem] px-4 py-3">
                          <TruncatedCell
                            value={student.username ?? "—"}
                            maxLength={COLUMN_LIMITS.username}
                          />
                        </td>
                        <td className="max-w-[14rem] px-4 py-3">
                          <TruncatedCell
                            value={student.email}
                            maxLength={COLUMN_LIMITS.email}
                          />
                        </td>
                        <td className="max-w-[9rem] px-4 py-3">
                          <TruncatedCell
                            value={student.phone ?? "—"}
                            maxLength={COLUMN_LIMITS.phone}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {formatBirthDate(student.birth_date)}
                        </td>
                        <td className="px-4 py-3">
                          <StudentStatusBadge status={student.status} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {format(new Date(student.created_at), "MMM d, yyyy")}
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <StudentViewAction student={student} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
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
