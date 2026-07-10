"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { AddStudentToClassDialog } from "@/components/manager/classes/add-student-to-class-dialog";
import { StudentClassStatusBadge } from "@/components/manager/students/student-class-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CLASS_STUDENT_TABLE_LIMITS } from "@/lib/constants/manager-class-student-display";
import { MANAGER_STUDENT_CLASS_STATUS_LABELS } from "@/lib/constants/manager-student-class-display";
import {
  STUDENT_CLASS_STATUS_VALUES,
  type StudentClassStatusValue,
} from "@/lib/constants/manager-student-class-status";
import { getManagerStudentDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerStudentFinalExamGradeRow } from "@/types/manager-class-final-exam";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerClassStudentRow } from "@/types/manager-class-student";
import type { ManagerStudentRow } from "@/types/manager-student";

const PAGE_SIZE = 10;
const STATUS_FILTER_ALL = "all";

type ClassStudentsSectionProps = {
  classId: string;
  className: string;
  initialStudents: ManagerClassStudentRow[];
  availableStudents: ManagerStudentRow[];
  onStudentsChange: (students: ManagerClassStudentRow[]) => void;
  onAvailableStudentsChange: (students: ManagerStudentRow[]) => void;
  onClassUpdated: (classRow: ManagerClassRow) => void;
  onStudentGradeAdded: (grade: ManagerStudentFinalExamGradeRow) => void;
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

function matchesSearch(student: ManagerClassStudentRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    student.full_name,
    student.username ?? "",
    student.email,
    student.phone ?? "",
    student.enrollment_status,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function ClassStudentsSection({
  classId,
  className,
  initialStudents,
  availableStudents,
  onStudentsChange,
  onAvailableStudentsChange,
  onClassUpdated,
  onStudentGradeAdded,
}: ClassStudentsSectionProps) {
  const [students, setStudents] = useState(initialStudents);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesStatus =
        statusFilter === STATUS_FILTER_ALL ||
        student.enrollment_status === statusFilter;

      return matchesStatus && matchesSearch(student, searchQuery);
    });
  }, [students, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedStudents = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredStudents.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredStudents, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredStudents.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * PAGE_SIZE,
    filteredStudents.length
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value ?? STATUS_FILTER_ALL);
    setCurrentPage(1);
  };

  const handleAddStudent = (
    student: ManagerClassStudentRow,
    classRow: ManagerClassRow,
    studentGrade?: ManagerStudentFinalExamGradeRow
  ) => {
    if (students.some((row) => row.id === student.id)) {
      return;
    }

    const nextStudents = [student, ...students];
    setStudents(nextStudents);
    onStudentsChange(nextStudents);
    onAvailableStudentsChange(
      availableStudents.filter(
        (row) => row.student_profile_id !== student.student_profile_id
      )
    );
    onClassUpdated(classRow);
    if (studentGrade) {
      onStudentGradeAdded(studentGrade);
    }
    setCurrentPage(1);
  };

  return (
    <TooltipProvider>
      {isAddOpen ? (
        <AddStudentToClassDialog
          open
          onOpenChange={setIsAddOpen}
          classId={classId}
          className={className}
          availableStudents={availableStudents}
          onStudentAdded={handleAddStudent}
        />
      ) : null}

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Students</CardTitle>
          <CardAction className="self-center">
            <Button type="button" onClick={() => setIsAddOpen(true)}>
              <PlusIcon data-icon="inline-start" />
              Add student
            </Button>
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
                aria-label="Search class students"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger
                className="w-full sm:w-44"
                aria-label="Filter by enrollment status"
              >
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
                {STUDENT_CLASS_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {
                      MANAGER_STUDENT_CLASS_STATUS_LABELS[
                        status as StudentClassStatusValue
                      ]
                    }
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Full name</th>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Enrollment</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      {students.length === 0
                        ? "No students enrolled in this class yet."
                        : "No students match your filters."}
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b last:border-b-0 hover:bg-muted/30"
                    >
                      <td className="max-w-[12rem] px-4 py-3">
                        <TruncatedCell
                          value={student.full_name}
                          maxLength={CLASS_STUDENT_TABLE_LIMITS.fullName}
                        />
                      </td>
                      <td className="max-w-[10rem] px-4 py-3">
                        <TruncatedCell
                          value={student.username ?? "—"}
                          maxLength={CLASS_STUDENT_TABLE_LIMITS.username}
                        />
                      </td>
                      <td className="max-w-[14rem] px-4 py-3">
                        <TruncatedCell
                          value={student.email}
                          maxLength={CLASS_STUDENT_TABLE_LIMITS.email}
                        />
                      </td>
                      <td className="max-w-[9rem] px-4 py-3">
                        <TruncatedCell
                          value={student.phone ?? "—"}
                          maxLength={CLASS_STUDENT_TABLE_LIMITS.phone}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <StudentClassStatusBadge
                          status={student.enrollment_status}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {student.joined_at
                          ? format(new Date(student.joined_at), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={getManagerStudentDetailRoute(
                            student.student_profile_id
                          )}
                          aria-label={`View ${student.full_name}`}
                          className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <EyeIcon className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredStudents.length > 0 ? (
            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {filteredStudents.length}
              </p>

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
    </TooltipProvider>
  );
}
