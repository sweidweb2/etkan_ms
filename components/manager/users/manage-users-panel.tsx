"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
  SearchIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { ActivateInactivateStudentDialog } from "@/components/manager/students/activate-inactivate-student-dialog";
import { AddUserDialog } from "@/components/manager/users/add-user-dialog";
import { EditUserDialog } from "@/components/manager/users/edit-user-dialog";
import { UserRoleBadge } from "@/components/manager/users/user-role-badge";
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
import { MANAGER_USER_ROLE_LABELS } from "@/lib/constants/manager-user-display";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import type { StudentStatusValue } from "@/lib/constants/manager-student-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerStudentDetailRoute,
  getManagerUserDetailRoute,
} from "@/lib/constants/routes";
import { ROLE_VALUES, ROLES } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type { ManagerUserRow } from "@/types/manager-user";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const COLUMN_LIMITS = {
  username: 20,
  email: 32,
} as const;

const ROLE_FILTER_ALL = "all";

const USER_ROW_CLASS =
  "cursor-pointer border-b last:border-b-0 transition-all duration-150 hover:bg-primary/10 hover:shadow-[inset_4px_0_0_0_var(--primary)] active:bg-primary/15 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

const ROLE_LABELS = MANAGER_USER_ROLE_LABELS;

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

function matchesSearch(user: ManagerUserRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const username = user.username?.toLowerCase() ?? "";
  const email = user.email.toLowerCase();

  return username.includes(normalizedQuery) || email.includes(normalizedQuery);
}

function CurrentUserBadge() {
  return (
    <span className="inline-flex shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
      you
    </span>
  );
}

function getUserDetailsHref(user: ManagerUserRow) {
  if (user.role === ROLES.STUDENT && user.student_profile_id) {
    return getManagerStudentDetailRoute(user.student_profile_id);
  }

  return getManagerUserDetailRoute(user.id);
}

function UserDetailsLink({ user }: { user: ManagerUserRow }) {
  const label = user.username ?? user.email;

  return (
    <Link
      href={getUserDetailsHref(user)}
      aria-label={`View ${label}`}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
    >
      <EyeIcon className="size-4" />
    </Link>
  );
}

export function ManageUsersPanel({
  initialUsers,
  currentUserId,
}: {
  initialUsers: ManagerUserRow[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagerUserRow | null>(null);
  const [statusTarget, setStatusTarget] = useState<ManagerUserRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(ROLE_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    10
  );
  const [currentPage, setCurrentPage] = useState(1);

  const users = initialUsers;

  const stats = useMemo(
    () => ({
      total: users.length,
      students: users.filter((user) => user.role === ROLES.STUDENT).length,
      teachers: users.filter(
        (user) =>
          user.role === ROLES.TEACHER || user.role === ROLES.TRAINER
      ).length,
      staff: users.filter(
        (user) =>
          user.role === ROLES.MANAGER ||
          user.role === ROLES.CO_MANAGER ||
          user.role === ROLES.ADMIN ||
          user.role === ROLES.CEO
      ).length,
    }),
    [users]
  );

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole =
        roleFilter === ROLE_FILTER_ALL || user.role === roleFilter;
      return matchesRole && matchesSearch(user, searchQuery);
    });
  }, [roleFilter, searchQuery, users]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredUsers.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, filteredUsers.length);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleRoleFilterChange = (value: string | null) => {
    setRoleFilter(value ?? ROLE_FILTER_ALL);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  };

  const handleUserCreated = () => {
    setCurrentPage(1);
    router.refresh();
  };

  const handleUserUpdated = () => {
    setEditingUser(null);
    router.refresh();
  };

  const openUserDetails = (user: ManagerUserRow) => {
    router.push(getUserDetailsHref(user));
  };

  const handleUserRowKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    user: ManagerUserRow
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openUserDetails(user);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Manage users</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View and create staff accounts for your school.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UserStatCard
            label="Total users"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Students"
            value={stats.students}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Teachers"
            value={stats.teachers}
            accentClassName="border-l-violet-500"
          />
          <UserStatCard
            label="Staff"
            value={stats.staff}
            accentClassName="border-l-amber-500"
          />
        </div>

        <AddUserDialog
          open={isAddUserOpen}
          onOpenChange={setIsAddUserOpen}
          onUserCreated={handleUserCreated}
        />

        {editingUser ? (
          <EditUserDialog
            open
            onOpenChange={(open) => {
              if (!open) {
                setEditingUser(null);
              }
            }}
            user={editingUser}
            onUserUpdated={handleUserUpdated}
          />
        ) : null}

        {statusTarget &&
        statusTarget.role === ROLES.STUDENT &&
        statusTarget.student_profile_id ? (
          <ActivateInactivateStudentDialog
            open
            onOpenChange={(open) => {
              if (!open) {
                setStatusTarget(null);
              }
            }}
            userId={statusTarget.id}
            displayName={
              statusTarget.student_full_name ??
              statusTarget.username ??
              statusTarget.email
            }
            currentStatus={
              (statusTarget.student_status ??
                STUDENT_STATUSES.ACTIVE) as StudentStatusValue
            }
            onCompleted={() => {
              setStatusTarget(null);
              router.refresh();
            }}
          />
        ) : null}

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle>Users</CardTitle>
            <CardAction className="self-center">
              <Can permission={PERMISSIONS.USERS_CREATE}>
                <Button type="button" onClick={() => setIsAddUserOpen(true)}>
                  <PlusIcon data-icon="inline-start" />
                  Add user
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
                  placeholder="Search username or email…"
                  className="pl-8"
                  aria-label="Search users"
                />
              </div>
              <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                <SelectTrigger className="w-full sm:w-44" aria-label="Filter by role">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={ROLE_FILTER_ALL}>All roles</SelectItem>
                  {ROLE_VALUES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium">Username</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 text-center font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        No users match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const isCurrentUser = currentUserId !== null && user.id === currentUserId;

                      return (
                      <tr
                        key={user.id}
                        className={cn(
                          USER_ROW_CLASS,
                          isCurrentUser && "bg-primary/5"
                        )}
                        tabIndex={0}
                        role="link"
                        aria-label={`View details for ${user.username ?? user.email}`}
                        onClick={() => openUserDetails(user)}
                        onKeyDown={(event) => handleUserRowKeyDown(event, user)}
                      >
                        <td className="max-w-[10rem] px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <TruncatedCell
                              value={user.username ?? "—"}
                              maxLength={COLUMN_LIMITS.username}
                            />
                            {isCurrentUser ? <CurrentUserBadge /> : null}
                          </div>
                        </td>
                        <td className="max-w-[14rem] px-4 py-3">
                          <TruncatedCell
                            value={user.email}
                            maxLength={COLUMN_LIMITS.email}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <UserRoleBadge role={user.role} />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                          {format(new Date(user.created_at), "MMM d, yyyy")}
                        </td>
                        <td
                          className="px-4 py-3 text-center"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-center gap-1">
                            <Can permission={PERMISSIONS.USERS_UPDATE}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="size-7 text-muted-foreground hover:bg-primary/15 hover:text-primary"
                                aria-label={`Edit ${user.username ?? user.email}`}
                                onClick={() => setEditingUser(user)}
                              >
                                <PencilIcon className="size-4" />
                              </Button>
                            </Can>
                            {user.role === ROLES.STUDENT &&
                            user.student_profile_id ? (
                              <Can
                                permission={PERMISSIONS.STUDENTS_CHANGE_STATUS}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="size-7 text-muted-foreground hover:bg-primary/15 hover:text-primary"
                                  aria-label={
                                    (user.student_status ??
                                      STUDENT_STATUSES.ACTIVE) ===
                                    STUDENT_STATUSES.ACTIVE
                                      ? `Inactivate ${user.username ?? user.email}`
                                      : `Activate ${user.username ?? user.email}`
                                  }
                                  onClick={() => setStatusTarget(user)}
                                >
                                  <PowerIcon className="size-4" />
                                </Button>
                              </Can>
                            ) : null}
                            <UserDetailsLink user={user} />
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {filteredUsers.length}
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
