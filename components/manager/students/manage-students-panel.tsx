"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import { loadStudentsPageAction } from "@/app/manager/students/actions";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { ActivateInactivateStudentDialog } from "@/components/manager/students/activate-inactivate-student-dialog";
import { AddStudentDialog } from "@/components/manager/students/add-student-dialog";
import { StudentStatusBadge } from "@/components/manager/students/student-status-badge";
import { EditUserDialog } from "@/components/manager/users/edit-user-dialog";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyTextButton } from "@/components/ui/copy-text-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { LetterAvatar } from "@/components/ui/letter-avatar";
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
import { ROLES } from "@/lib/constants/roles";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerStudentRow,
  ManagerStudentsListData,
  ManagerStudentsListQuery,
} from "@/types/manager-student";
import type { ManagerUserRow } from "@/types/manager-user";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const COLUMN_LIMITS = {
  fullName: 24,
  email: 32,
  phone: 18,
} as const;

const STATUS_FILTER_ALL = "all";
const DEFAULT_PAGE_SIZE = 10;

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

type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

function listQueryKey(query: {
  status: string;
  search: string;
  page: number;
  pageSize: number;
}) {
  return `${query.status}|${query.search}|${query.page}|${query.pageSize}`;
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

function toManagerUserRow(student: ManagerStudentRow): ManagerUserRow {
  return {
    id: student.user_id,
    full_name: student.full_name,
    email: student.email,
    role: student.role ?? ROLES.STUDENT,
    is_instructor: student.is_instructor ?? false,
    created_at: student.created_at,
    student_profile_id: student.student_profile_id,
    student_full_name: student.full_name,
    student_birth_date: student.birth_date,
    student_phone: student.phone,
    student_status: student.status,
  };
}

function mergeUpdatedUserIntoStudent(
  student: ManagerStudentRow,
  user: ManagerUserRow
): ManagerStudentRow {
  return {
    ...student,
    email: user.email,
    role: user.role,
    is_instructor: user.is_instructor,
    full_name: user.student_full_name ?? user.full_name,
    birth_date: user.student_birth_date ?? null,
    phone: user.student_phone ?? null,
    status: user.student_status ?? student.status,
  };
}

function StudentEditAction({
  student,
  onOpen,
}: {
  student: ManagerStudentRow;
  onOpen: (student: ManagerStudentRow) => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="size-7 text-muted-foreground hover:bg-primary/15 hover:text-primary"
      aria-label={`Edit ${student.full_name}`}
      onClick={(event) => {
        event.stopPropagation();
        onOpen(student);
      }}
    >
      <PencilIcon className="size-4" />
    </Button>
  );
}

function StudentStatusAction({
  student,
  onOpen,
}: {
  student: ManagerStudentRow;
  onOpen: (student: ManagerStudentRow) => void;
}) {
  const isActivate = student.status !== STUDENT_STATUSES.ACTIVE;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="size-7 text-muted-foreground hover:bg-primary/15 hover:text-primary"
      aria-label={
        isActivate
          ? `Activate ${student.full_name}`
          : `Inactivate ${student.full_name}`
      }
      onClick={(event) => {
        event.stopPropagation();
        onOpen(student);
      }}
    >
      <PowerIcon className="size-4" />
    </Button>
  );
}

export function ManageStudentsPanel({
  initialData,
}: {
  initialData: ManagerStudentsListData;
}) {
  const router = useRouter();
  const [students, setStudents] = useState(initialData.students);
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [stats, setStats] = useState(initialData.stats);
  const [isLoading, startTransition] = useTransition();
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<ManagerStudentRow | null>(
    null
  );
  const [editingStudent, setEditingStudent] = useState<ManagerStudentRow | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);
  const [pageSize, setPageSize] = useState<PageSizeOption>(
    (PAGE_SIZE_OPTIONS as readonly number[]).includes(initialData.pageSize)
      ? (initialData.pageSize as PageSizeOption)
      : DEFAULT_PAGE_SIZE
  );
  const [currentPage, setCurrentPage] = useState(initialData.page);

  const loadedKeyRef = useRef(
    listQueryKey({
      status: STATUS_FILTER_ALL,
      search: "",
      page: initialData.page,
      pageSize: initialData.pageSize,
    })
  );
  const requestIdRef = useRef(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart = totalCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, totalCount);

  const buildListQuery = (
    overrides: Partial<{
      status: string;
      search: string;
      page: number;
      pageSize: number;
    }> = {}
  ): ManagerStudentsListQuery => {
    const status = overrides.status ?? statusFilter;
    return {
      page: overrides.page ?? currentPage,
      pageSize: overrides.pageSize ?? pageSize,
      status: status === STATUS_FILTER_ALL ? null : (status as StudentStatusValue),
      search: overrides.search ?? debouncedSearch,
    };
  };

  const applyListData = (data: ManagerStudentsListData) => {
    setStudents(data.students);
    setTotalCount(data.totalCount);
    setStats(data.stats);
  };

  const loadPage = (query: ManagerStudentsListQuery) => {
    const requestId = ++requestIdRef.current;
    startTransition(async () => {
      const data = await loadStudentsPageAction(query);
      if (requestId !== requestIdRef.current) {
        return;
      }
      if (!data) {
        showErrorToast("Unable to load students.");
        return;
      }
      applyListData(data);
      if (data.page !== query.page) {
        // Server fell back to the last page; keep the page state in sync.
        loadedKeyRef.current = listQueryKey({
          status: query.status ?? STATUS_FILTER_ALL,
          search: query.search ?? "",
          page: data.page,
          pageSize: data.pageSize,
        });
        setCurrentPage(data.page);
      }
    });
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = searchQuery.trim();
      if (next !== debouncedSearch) {
        setDebouncedSearch(next);
        setCurrentPage(1);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [debouncedSearch, searchQuery]);

  useEffect(() => {
    const key = listQueryKey({
      status: statusFilter,
      search: debouncedSearch,
      page: currentPage,
      pageSize,
    });
    if (key === loadedKeyRef.current) {
      return;
    }
    loadedKeyRef.current = key;
    loadPage({
      page: currentPage,
      pageSize,
      status:
        statusFilter === STATUS_FILTER_ALL
          ? null
          : (statusFilter as StudentStatusValue),
      search: debouncedSearch,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, pageSize, statusFilter]);

  const reloadCurrentPage = () => {
    loadPage(buildListQuery());
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleStatusFilterChange = (value: string | null) => {
    setStatusFilter(value ?? STATUS_FILTER_ALL);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as PageSizeOption);
    setCurrentPage(1);
  };

  const handleStudentCreated = () => {
    // Reset filters and reload page 1 so the new row and global stats are exact.
    setSearchQuery("");
    setDebouncedSearch("");
    setStatusFilter(STATUS_FILTER_ALL);
    setCurrentPage(1);
    loadedKeyRef.current = listQueryKey({
      status: STATUS_FILTER_ALL,
      search: "",
      page: 1,
      pageSize,
    });
    loadPage({ page: 1, pageSize, status: null, search: "" });
  };

  const handleUserUpdated = (user: ManagerUserRow) => {
    setStudents((current) =>
      current.map((student) =>
        student.user_id === user.id
          ? mergeUpdatedUserIntoStudent(student, user)
          : student
      )
    );
    reloadCurrentPage();
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
        <PanelPageHeader title="Manage students" />

        <div className="grid gap-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-4">
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

        {editingStudent ? (
          <EditUserDialog
            open
            onOpenChange={(open) => {
              if (!open) {
                setEditingStudent(null);
              }
            }}
            user={toManagerUserRow(editingStudent)}
            onUserUpdated={handleUserUpdated}
          />
        ) : null}

        {statusTarget ? (
          <ActivateInactivateStudentDialog
            open
            onOpenChange={(open) => {
              if (!open) {
                setStatusTarget(null);
              }
            }}
            userId={statusTarget.user_id}
            displayName={statusTarget.full_name}
            currentStatus={statusTarget.status}
            onCompleted={(status) => {
              setStatusTarget(null);
              if (statusTarget) {
                setStudents((current) =>
                  current.map((student) =>
                    student.user_id === statusTarget.user_id
                      ? { ...student, status }
                      : student
                  )
                );
                reloadCurrentPage();
              }
            }}
          />
        ) : null}

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
            <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name or phone…"
                  className="pl-8"
                  aria-label="Search students"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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
                      {MANAGER_STUDENT_STATUS_LABELS[status as StudentStatusValue]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {students.length === 0 ? (
              <EmptyState
                className={cn("m-4", isLoading && "opacity-60")}
                icon={stats.total === 0 ? UsersIcon : SearchIcon}
                title={
                  stats.total === 0
                    ? "No students yet"
                    : "No matching students"
                }
                description={
                  stats.total === 0
                    ? "Create a student account to get started."
                    : "No students match your filters."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="w-12 px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Full name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Birth date</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={cn(isLoading && "opacity-60")}>
                    {students.map((student, index) => (
                      <tr
                        key={student.student_profile_id}
                        className={STUDENT_ROW_CLASS}
                        tabIndex={0}
                        role="link"
                        aria-label={`View details for ${student.full_name}`}
                        onClick={() => openStudentDetails(student)}
                        onKeyDown={(event) =>
                          handleStudentRowKeyDown(event, student)
                        }
                      >
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">
                          {rangeStart + index}
                        </td>
                        <td className="max-w-[14rem] px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <LetterAvatar
                              name={student.full_name}
                              seed={student.student_profile_id}
                            />
                            <TruncatedCell
                              value={student.full_name}
                              maxLength={COLUMN_LIMITS.fullName}
                              className="min-w-0"
                            />
                          </div>
                        </td>
                        <td className="max-w-[14rem] px-4 py-3">
                          <div className="flex min-w-0 items-center gap-1">
                            <TruncatedCell
                              value={student.email}
                              maxLength={COLUMN_LIMITS.email}
                              className="min-w-0"
                            />
                            <CopyTextButton
                              value={student.email}
                              label={`Copy email for ${student.full_name}`}
                              successMessage="Email copied to clipboard."
                              errorMessage="Unable to copy email."
                            />
                          </div>
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
                          <div className="inline-flex items-center justify-end gap-1">
                            <Can permission={PERMISSIONS.USERS_UPDATE}>
                              <StudentEditAction
                                student={student}
                                onOpen={setEditingStudent}
                              />
                            </Can>
                            <Can permission={PERMISSIONS.STUDENTS_CHANGE_STATUS}>
                              <StudentStatusAction
                                student={student}
                                onOpen={setStatusTarget}
                              />
                            </Can>
                            <StudentViewAction student={student} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  Showing {rangeStart}–{rangeEnd} of {totalCount}
                  {isLoading ? <InlineSpinner /> : null}
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
