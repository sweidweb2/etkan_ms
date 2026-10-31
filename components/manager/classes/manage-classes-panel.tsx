"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  loadClassesPageAction,
  loadStudentsWithoutActiveClassAction,
} from "@/app/manager/classes/actions";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  GraduationCapIcon,
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
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLASS_STATUSES,
  CLASS_STATUS_VALUES,
  type ClassStatusValue,
} from "@/lib/constants/manager-class-status";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import { COLLAPSIBLE_SECTION_STORAGE_KEYS } from "@/lib/constants/collapsible-section-storage";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import { showErrorToast } from "@/lib/toast";
import type { ManagerClassSemesterOption } from "@/types/manager-class-detail";
import type {
  ManagerClassesListData,
  ManagerClassesListQuery,
  ManagerClassRow,
  ManagerClassStatusCounts,
} from "@/types/manager-class-list";
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

function listQueryKey(query: {
  status: string;
  semester: string;
  search: string;
  page: number;
}) {
  return `${query.status}|${query.semester}|${query.search}|${query.page}`;
}

function buildListQuery(input: {
  status: string;
  semester: string;
  search: string;
  page: number;
  pageSize: number;
}): ManagerClassesListQuery {
  return {
    page: input.page,
    pageSize: input.pageSize,
    status:
      input.status === STATUS_FILTER_ALL
        ? null
        : (input.status as ClassStatusValue),
    semesterId:
      input.semester === SEMESTER_FILTER_ALL ||
      input.semester === SEMESTER_FILTER_UNLINKED
        ? null
        : input.semester,
    unlinkedSemester: input.semester === SEMESTER_FILTER_UNLINKED,
    search: input.search,
  };
}

type ManageClassesPanelProps = {
  initialData: ManagerClassesListData;
  semesterOptions: ManagerClassSemesterOption[];
};

export function ManageClassesPanel({
  initialData,
  semesterOptions,
}: ManageClassesPanelProps) {
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
  const [studentsWithoutActiveClassLoaded, setStudentsWithoutActiveClassLoaded] =
    useState(false);

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
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);
  const [semesterFilter, setSemesterFilter] = useState(SEMESTER_FILTER_ALL);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(initialData.page);
  const loadedKeyRef = useRef(
    listQueryKey({
      status: STATUS_FILTER_ALL,
      semester: SEMESTER_FILTER_ALL,
      search: "",
      page: initialData.page,
    })
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const key = listQueryKey({
      status: statusFilter,
      semester: semesterFilter,
      search: debouncedSearch,
      page: currentPage,
    });
    if (key === loadedKeyRef.current) {
      return;
    }
    loadedKeyRef.current = key;
    let cancelled = false;
    setIsLoading(true);
    void loadClassesPageAction(
      buildListQuery({
        status: statusFilter,
        semester: semesterFilter,
        search: debouncedSearch,
        page: currentPage,
        pageSize,
      })
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
  }, [currentPage, debouncedSearch, pageSize, semesterFilter, statusFilter]);

  const stats = useMemo(
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
  const rangeStart = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, totalCount);

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

  const handleCreateClass = () => {
    // Reset filters and reload page 1 so the new class (newest first) and the
    // global status counts come from the server.
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter(STATUS_FILTER_ALL);
    setSemesterFilter(SEMESTER_FILTER_ALL);
    setCurrentPage(1);
    loadedKeyRef.current = listQueryKey({
      status: STATUS_FILTER_ALL,
      semester: SEMESTER_FILTER_ALL,
      search: "",
      page: 1,
    });
    setIsLoading(true);
    void loadClassesPageAction(
      buildListQuery({
        status: STATUS_FILTER_ALL,
        semester: SEMESTER_FILTER_ALL,
        search: "",
        page: 1,
        pageSize,
      })
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
          value={
            stats.studentsWithoutActiveClass ?? "…"
          }
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
                placeholder="Search class name or subject…"
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

          {classes.length === 0 ? (
            <EmptyState
              icon={stats.total === 0 ? GraduationCapIcon : SearchIcon}
              title={
                stats.total === 0 ? "No classes yet" : "No matching classes"
              }
              description={
                stats.total === 0
                  ? "Create one to get started."
                  : "No classes match your filters."
              }
            />
          ) : (
            <div
              className={cn(
                "grid w-full justify-start gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,16.5rem),16.5rem))]",
                isLoading && "opacity-60"
              )}
            >
              {classes.map((classRow) => (
                <ClassCard key={classRow.id} classRow={classRow} />
              ))}
            </div>
          )}

          {totalCount > 0 ? (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
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
                  disabled={isLoading || safeCurrentPage >= totalPages}
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
