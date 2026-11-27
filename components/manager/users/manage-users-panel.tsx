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
  SearchIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { loadUsersPageAction } from "@/app/manager/users/actions";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { AddUserDialog } from "@/components/manager/users/add-user-dialog";
import { EditUserDialog } from "@/components/manager/users/edit-user-dialog";
import { UserRoleBadge } from "@/components/manager/users/user-role-badge";
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
import { MANAGER_USER_ROLE_LABELS } from "@/lib/constants/manager-user-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerUserDetailRoute } from "@/lib/constants/routes";
import { ROLE_VALUES, ROLES, type RoleValue } from "@/lib/constants/roles";
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerUserRow,
  ManagerUsersListData,
  ManagerUsersListQuery,
} from "@/types/manager-user";

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const COLUMN_LIMITS = {
  fullName: 28,
  email: 32,
} as const;

const ROLE_FILTER_ALL = "all";
const STAFF_ROLE_VALUES = ROLE_VALUES.filter((role) => role !== ROLES.STUDENT);
const DEFAULT_PAGE_SIZE = 10;

const USER_ROW_CLASS =
  "cursor-pointer border-b last:border-b-0 transition-all duration-150 hover:bg-primary/10 hover:shadow-[inset_4px_0_0_0_var(--primary)] active:bg-primary/15 focus-visible:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset";

const ROLE_LABELS = MANAGER_USER_ROLE_LABELS;

type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

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

function listQueryKey(query: {
  role: string;
  search: string;
  page: number;
  pageSize: number;
}) {
  return `${query.role}|${query.search}|${query.page}|${query.pageSize}`;
}

function CurrentUserBadge() {
  return (
    <span className="inline-flex shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
      you
    </span>
  );
}

function UserDetailsLink({ user }: { user: ManagerUserRow }) {
  const label = user.full_name || user.email;

  return (
    <Link
      href={getManagerUserDetailRoute(user.id)}
      aria-label={`View ${label}`}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary"
    >
      <EyeIcon className="size-4" />
    </Link>
  );
}

export function ManageUsersPanel({
  initialData,
  currentUserId,
}: {
  initialData: ManagerUsersListData;
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [users, setUsers] = useState(initialData.users);
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [stats, setStats] = useState(initialData.stats);
  const [isLoading, startTransition] = useTransition();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagerUserRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>(ROLE_FILTER_ALL);
  const [pageSize, setPageSize] = useState<PageSizeOption>(
    (PAGE_SIZE_OPTIONS as readonly number[]).includes(initialData.pageSize)
      ? (initialData.pageSize as PageSizeOption)
      : DEFAULT_PAGE_SIZE
  );
  const [currentPage, setCurrentPage] = useState(initialData.page);

  const loadedKeyRef = useRef(
    listQueryKey({
      role: ROLE_FILTER_ALL,
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
      role: string;
      search: string;
      page: number;
      pageSize: number;
    }> = {}
  ): ManagerUsersListQuery => {
    const role = overrides.role ?? roleFilter;
    return {
      page: overrides.page ?? currentPage,
      pageSize: overrides.pageSize ?? pageSize,
      role: role === ROLE_FILTER_ALL ? null : (role as RoleValue),
      search: overrides.search ?? debouncedSearch,
    };
  };

  const applyListData = (data: ManagerUsersListData) => {
    setUsers(data.users);
    setTotalCount(data.totalCount);
    setStats(data.stats);
  };

  const loadPage = (query: ManagerUsersListQuery) => {
    const requestId = ++requestIdRef.current;
    startTransition(async () => {
      const data = await loadUsersPageAction(query);
      if (requestId !== requestIdRef.current) {
        return;
      }
      if (!data) {
        showErrorToast("Unable to load users.");
        return;
      }
      applyListData(data);
      if (data.page !== query.page) {
        loadedKeyRef.current = listQueryKey({
          role: query.role ?? ROLE_FILTER_ALL,
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
      role: roleFilter,
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
      role:
        roleFilter === ROLE_FILTER_ALL ? null : (roleFilter as RoleValue),
      search: debouncedSearch,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, pageSize, roleFilter]);

  const reloadCurrentPage = () => {
    loadPage(buildListQuery());
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleRoleFilterChange = (value: string | null) => {
    setRoleFilter(value ?? ROLE_FILTER_ALL);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as PageSizeOption);
    setCurrentPage(1);
  };

  const handleUserCreated = (_user: ManagerUserRow) => {
    setSearchQuery("");
    setDebouncedSearch("");
    setRoleFilter(ROLE_FILTER_ALL);
    setCurrentPage(1);
    loadedKeyRef.current = listQueryKey({
      role: ROLE_FILTER_ALL,
      search: "",
      page: 1,
      pageSize,
    });
    loadPage({ page: 1, pageSize, role: null, search: "" });
  };

  const handleUserUpdated = (user: ManagerUserRow) => {
    if (user.role === ROLES.STUDENT) {
      setUsers((current) => current.filter((row) => row.id !== user.id));
      setTotalCount((count) => Math.max(0, count - 1));
      reloadCurrentPage();
    } else {
      setUsers((current) =>
        current.map((row) => (row.id === user.id ? user : row))
      );
      reloadCurrentPage();
    }
    setEditingUser(null);
  };

  const openUserDetails = (user: ManagerUserRow) => {
    router.push(getManagerUserDetailRoute(user.id));
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
        <PanelPageHeader title="Manage users" />

        <div className="grid gap-4 @lg/panel:grid-cols-3">
          <UserStatCard
            label="Total users"
            value={stats.total}
            accentClassName="border-l-sky-500"
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
            <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name…"
                  className="pr-8 pl-8"
                  aria-label="Search users"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <XIcon className="size-4" />
                  </button>
                ) : null}
              </div>
              <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
                <SelectTrigger className="w-full @lg/panel:w-44" aria-label="Filter by role">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={ROLE_FILTER_ALL}>All roles</SelectItem>
                  {STAFF_ROLE_VALUES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {users.length === 0 ? (
              <EmptyState
                size="sm"
                className={cn("m-4", isLoading && "opacity-60")}
                icon={stats.total === 0 ? UsersIcon : SearchIcon}
                title={
                  stats.total === 0
                    ? "No users yet"
                    : "No users match your filters"
                }
                description={
                  stats.total === 0
                    ? "Add a user to get started."
                    : "Try a different search or role filter."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="w-12 px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Full name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className={cn(isLoading && "opacity-60")}>
                    {users.map((user, index) => {
                      const isCurrentUser =
                        currentUserId !== null && user.id === currentUserId;

                      return (
                        <tr
                          key={user.id}
                          className={cn(
                            USER_ROW_CLASS,
                            isCurrentUser && "bg-primary/5"
                          )}
                          tabIndex={0}
                          role="link"
                          aria-label={`View details for ${user.full_name || user.email}`}
                          onClick={() => openUserDetails(user)}
                          onKeyDown={(event) =>
                            handleUserRowKeyDown(event, user)
                          }
                        >
                          <td className="px-4 py-3 text-muted-foreground tabular-nums">
                            {rangeStart + index}
                          </td>
                          <td className="max-w-[12rem] px-4 py-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <LetterAvatar
                                name={user.full_name || user.email}
                                seed={user.id}
                              />
                              <TruncatedCell
                                value={user.full_name || "—"}
                                maxLength={COLUMN_LIMITS.fullName}
                                className="min-w-0"
                              />
                              {isCurrentUser ? <CurrentUserBadge /> : null}
                            </div>
                          </td>
                          <td className="max-w-[14rem] px-4 py-3">
                            <div className="flex min-w-0 items-center gap-1">
                              <TruncatedCell
                                value={user.email}
                                maxLength={COLUMN_LIMITS.email}
                                className="min-w-0"
                              />
                              <CopyTextButton
                                value={user.email}
                                label={`Copy email for ${user.full_name || user.email}`}
                                successMessage="Email copied to clipboard."
                                errorMessage="Unable to copy email."
                              />
                            </div>
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
                                  aria-label={`Edit ${user.full_name || user.email}`}
                                  onClick={() => setEditingUser(user)}
                                >
                                  <PencilIcon className="size-4" />
                                </Button>
                              </Can>
                              <UserDetailsLink user={user} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
