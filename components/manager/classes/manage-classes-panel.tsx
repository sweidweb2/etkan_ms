"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddClassDialog } from "@/components/manager/classes/add-class-dialog";
import { ClassCard } from "@/components/manager/classes/class-card";
import { StudentsWithoutActiveClassCard } from "@/components/manager/shared/students-without-active-class-card";
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
import { CLASS_STATUSES, CLASS_STATUS_VALUES } from "@/lib/constants/manager-class-status";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { ManagerClassRow } from "@/types/manager-class-list";
import type { ManagerStudentWithoutActiveClassRow } from "@/types/manager-student";

const PAGE_SIZE = 6;
const STATUS_FILTER_ALL = "all";
const SEMESTER_FILTER_ALL = "all";
const SEMESTER_FILTER_UNLINKED = "unlinked";

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

function matchesSearch(classRow: ManagerClassRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    classRow.name,
    classRow.id,
    classRow.subject_name,
    classRow.semester_name ?? "",
    classRow.status,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

type ManageClassesPanelProps = {
  initialClasses: ManagerClassRow[];
  initialStudentsWithoutActiveClass: ManagerStudentWithoutActiveClassRow[];
};

export function ManageClassesPanel({
  initialClasses,
  initialStudentsWithoutActiveClass,
}: ManageClassesPanelProps) {
  const [classes, setClasses] = useState(initialClasses);
  const studentsWithoutActiveClass = initialStudentsWithoutActiveClass;
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [semesterFilter, setSemesterFilter] = useState(SEMESTER_FILTER_ALL);
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(
    () => ({
      total: classes.length,
      inProgress: classes.filter((row) => row.status === CLASS_STATUSES.IN_PROGRESS)
        .length,
      scheduled: classes.filter((row) => row.status === CLASS_STATUSES.SCHEDULED).length,
      done: classes.filter((row) => row.status === CLASS_STATUSES.DONE).length,
      onHold: classes.filter(
        (row) =>
          row.status === CLASS_STATUSES.PAUSED || row.status === CLASS_STATUSES.STOPPED
      ).length,
      studentsWithoutActiveClass: studentsWithoutActiveClass.length,
    }),
    [classes, studentsWithoutActiveClass]
  );

  const semesterOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const classRow of classes) {
      if (classRow.semester_id && classRow.semester_name) {
        seen.set(classRow.semester_id, classRow.semester_name);
      }
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [classes]);

  const filteredClasses = useMemo(() => {
    return classes.filter((classRow) => {
      const matchesStatus =
        statusFilter === STATUS_FILTER_ALL || classRow.status === statusFilter;
      const matchesSemester =
        semesterFilter === SEMESTER_FILTER_ALL ||
        (semesterFilter === SEMESTER_FILTER_UNLINKED &&
          classRow.semester_id === null) ||
        classRow.semester_id === semesterFilter;

      return matchesStatus && matchesSemester && matchesSearch(classRow, searchQuery);
    });
  }, [classes, searchQuery, semesterFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedClasses = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredClasses.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredClasses, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredClasses.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safeCurrentPage * PAGE_SIZE, filteredClasses.length);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value ?? STATUS_FILTER_ALL);
    setCurrentPage(1);
  };

  const handleSemesterFilterChange = (value: string | null) => {
    setSemesterFilter(value ?? SEMESTER_FILTER_ALL);
    setCurrentPage(1);
  };

  const handleCreateClass = (classRow: ManagerClassRow) => {
    setClasses((current) => {
      if (current.some((row) => row.id === classRow.id)) {
        return current;
      }

      return [classRow, ...current];
    });
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Manage classes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Classes with subject, semester, and enrollment context.
          </p>
        </div>
        <Can permission={PERMISSIONS.CLASSES_CREATE}>
          <Button type="button" onClick={() => setIsAddOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add class
          </Button>
        </Can>
      </div>

      {isAddOpen ? (
        <AddClassDialog
          open
          onOpenChange={setIsAddOpen}
          onClassCreated={handleCreateClass}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
          label="Done"
          value={stats.done}
          accentClassName="border-l-emerald-500"
        />
        <UserStatCard
          label="On hold"
          value={stats.onHold}
          accentClassName="border-l-amber-500"
        />
        <UserStatCard
          label="No active class"
          value={stats.studentsWithoutActiveClass}
          accentClassName="border-l-rose-500"
        />
      </div>

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/50 py-3">
          <CardTitle>Classes</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 px-4 pt-2 pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search class name, subject, semester, or status…"
                className="pl-8"
                aria-label="Search classes"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger
                className="w-full lg:w-40"
                aria-label="Filter by status"
              >
                <SelectValue placeholder="Status">
                  {(value) =>
                    !value || value === STATUS_FILTER_ALL
                      ? "Status"
                      : (MANAGER_CLASS_STATUS_LABELS[
                          value as (typeof CLASS_STATUS_VALUES)[number]
                        ] ?? String(value))
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={STATUS_FILTER_ALL}>Status</SelectItem>
                {CLASS_STATUS_VALUES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {MANAGER_CLASS_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={semesterFilter}
              onValueChange={handleSemesterFilterChange}
            >
              <SelectTrigger
                className="w-full lg:w-52"
                aria-label="Filter by semester"
              >
                <SelectValue placeholder="Semester">
                  {(value) => {
                    if (!value || value === SEMESTER_FILTER_ALL) {
                      return "Semester";
                    }
                    if (value === SEMESTER_FILTER_UNLINKED) {
                      return "Unlinked";
                    }
                    return (
                      semesterOptions.find((semester) => semester.id === value)
                        ?.name ?? String(value)
                    );
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={SEMESTER_FILTER_ALL}>Semester</SelectItem>
                <SelectItem value={SEMESTER_FILTER_UNLINKED}>
                  Unlinked
                </SelectItem>
                {semesterOptions.map((semester) => (
                  <SelectItem key={semester.id} value={semester.id}>
                    {semester.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paginatedClasses.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {classes.length === 0
                ? "No classes yet. Create one to get started."
                : "No classes match your filters."}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedClasses.map((classRow) => (
                <ClassCard key={classRow.id} classRow={classRow} />
              ))}
            </div>
          )}

          {filteredClasses.length > 0 ? (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {filteredClasses.length}
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
