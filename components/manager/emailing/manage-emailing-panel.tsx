"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  GraduationCapIcon,
  MailIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  PenLineIcon,
  SearchIcon,
  SendIcon,
  SparklesIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import {
  ComposeEmailDialog,
  type ComposeEmailTarget,
} from "@/components/manager/emailing/compose-email-dialog";
import {
  listEmailingClassMemberUserIdsAction,
  loadEmailingRecipientsPageAction,
} from "@/app/manager/emailing/actions";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { UserRoleBadge } from "@/components/manager/users/user-role-badge";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
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
import { EMAIL_TEMPLATES, type EmailTemplateId } from "@/lib/email/templates";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { MANAGER_USER_ROLE_LABELS } from "@/lib/constants/manager-user-display";
import { EMAIL_REGEX } from "@/lib/validators/auth/fields";
import { ROLE_VALUES, type RoleValue } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import { showErrorToast } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  EmailingClassOption,
  ManagerEmailingRecipientsListData,
  ManagerEmailingRecipientsListQuery,
} from "@/types/manager-emailing";
import type { ManagerUserRow } from "@/types/manager-user";

type ManageEmailingPanelProps = {
  initialData: ManagerEmailingRecipientsListData;
  classes: EmailingClassOption[];
};

type ReadyAction = {
  id: EmailTemplateId;
  title: string;
  description: string;
  icon: typeof SendIcon;
};

const PAGE_SIZE_OPTIONS = [5, 10, 25] as const;
const DEFAULT_PAGE_SIZE = 10;
const ROLE_FILTER_ALL = "all";
const CLASS_FILTER_ALL = "all";

type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

const READY_ACTION_ICONS: Record<EmailTemplateId, typeof SendIcon> = {
  welcome: UserPlusIcon,
  announcement: MegaphoneIcon,
  reminder: SendIcon,
  payment_reminder: CreditCardIcon,
  enrollment: GraduationCapIcon,
  custom: PenLineIcon,
};

const READY_ACTIONS: ReadyAction[] = EMAIL_TEMPLATES.map((template) => ({
  id: template.id,
  title: template.label,
  description: template.description,
  icon: READY_ACTION_ICONS[template.id],
}));

function SelectionCheckbox({
  checked,
  onCheckedChange,
  ariaLabel,
  onClick,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ariaLabel: string;
  onClick?: (event: MouseEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onClick={onClick}
      onChange={(event) => onCheckedChange(event.target.checked)}
      aria-label={ariaLabel}
      className="size-4 shrink-0 rounded border border-input accent-primary"
    />
  );
}

function getUserDisplayName(user: ManagerUserRow) {
  return user.full_name || "—";
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
  classFilter: string;
  classMemberKey: string;
  page: number;
  pageSize: number;
}) {
  return `${query.role}|${query.search}|${query.classFilter}|${query.classMemberKey}|${query.page}|${query.pageSize}`;
}

export function ManageEmailingPanel({
  initialData,
  classes,
}: ManageEmailingPanelProps) {
  const [users, setUsers] = useState(initialData.users);
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [stats, setStats] = useState(initialData.stats);
  const [isLoading, startTransition] = useTransition();
  const [loadError, setLoadError] = useState(false);
  const [selectedUsersById, setSelectedUsersById] = useState<
    Map<string, ManagerUserRow>
  >(() => new Map());
  const [composeTarget, setComposeTarget] = useState<ComposeEmailTarget | null>(
    null
  );
  const [composeTemplateId, setComposeTemplateId] =
    useState<EmailTemplateId>("custom");
  const [customToEmail, setCustomToEmail] = useState("");
  const [customToEmailError, setCustomToEmailError] = useState<string | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(ROLE_FILTER_ALL);
  const [classFilter, setClassFilter] = useState(CLASS_FILTER_ALL);
  const [classMemberUserIds, setClassMemberUserIds] = useState<string[] | null>(
    null
  );
  const [isClassMembersPending, setIsClassMembersPending] = useState(false);
  const [prevClassFilter, setPrevClassFilter] = useState(classFilter);
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
      classFilter: CLASS_FILTER_ALL,
      classMemberKey: "all",
      page: initialData.page,
      pageSize: initialData.pageSize,
    })
  );
  const requestIdRef = useRef(0);

  if (classFilter !== prevClassFilter) {
    setPrevClassFilter(classFilter);
    if (classFilter === CLASS_FILTER_ALL) {
      setClassMemberUserIds(null);
      setIsClassMembersPending(false);
    } else {
      setClassMemberUserIds(null);
      setIsClassMembersPending(true);
    }
  }

  const selectedUserIds = useMemo(
    () => new Set(selectedUsersById.keys()),
    [selectedUsersById]
  );
  const selectedUsers = useMemo(
    () => [...selectedUsersById.values()],
    [selectedUsersById]
  );
  const selectedWithEmail = useMemo(
    () => selectedUsers.filter((user) => Boolean(user.email)),
    [selectedUsers]
  );
  const canUseReadyActions = selectedWithEmail.length > 0;

  const classMemberKey =
    classFilter === CLASS_FILTER_ALL
      ? "all"
      : isClassMembersPending
        ? "pending"
        : classMemberUserIds
          ? [...classMemberUserIds].sort().join(",")
          : "empty";

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
      userIds: string[] | null;
    }> = {}
  ): ManagerEmailingRecipientsListQuery => {
    const role = overrides.role ?? roleFilter;
    const userIds =
      overrides.userIds !== undefined
        ? overrides.userIds
        : classFilter === CLASS_FILTER_ALL
          ? null
          : (classMemberUserIds ?? []);

    return {
      page: overrides.page ?? currentPage,
      pageSize: overrides.pageSize ?? pageSize,
      role: role === ROLE_FILTER_ALL ? null : (role as RoleValue),
      search: overrides.search ?? debouncedSearch,
      userIds,
    };
  };

  const applyListData = (data: ManagerEmailingRecipientsListData) => {
    setUsers(data.users);
    setTotalCount(data.totalCount);
    setStats(data.stats);
  };

  const loadPage = (query: ManagerEmailingRecipientsListQuery) => {
    const requestId = ++requestIdRef.current;
    setLoadError(false);
    startTransition(async () => {
      const data = await loadEmailingRecipientsPageAction(query);
      if (requestId !== requestIdRef.current) {
        return;
      }
      if (!data) {
        setLoadError(true);
        showErrorToast("Unable to load recipients.");
        return;
      }
      setLoadError(false);
      applyListData(data);
      if (data.page !== query.page) {
        loadedKeyRef.current = listQueryKey({
          role: query.role ?? ROLE_FILTER_ALL,
          search: query.search ?? "",
          classFilter,
          classMemberKey,
          page: data.page,
          pageSize: data.pageSize,
        });
        setCurrentPage(data.page);
      }
    });
  };

  useEffect(() => {
    if (classFilter === CLASS_FILTER_ALL) {
      return;
    }

    let cancelled = false;

    void listEmailingClassMemberUserIdsAction(classFilter)
      .then((ids) => {
        if (cancelled) {
          return;
        }
        setClassMemberUserIds(ids);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setClassMemberUserIds([]);
        showErrorToast("Unable to load class members.");
      })
      .finally(() => {
        if (!cancelled) {
          setIsClassMembersPending(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [classFilter]);

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
    if (classFilter !== CLASS_FILTER_ALL && isClassMembersPending) {
      return;
    }

    const key = listQueryKey({
      role: roleFilter,
      search: debouncedSearch,
      classFilter,
      classMemberKey,
      page: currentPage,
      pageSize,
    });
    if (key === loadedKeyRef.current) {
      return;
    }
    loadedKeyRef.current = key;
    loadPage(buildListQuery());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    classFilter,
    classMemberKey,
    currentPage,
    debouncedSearch,
    isClassMembersPending,
    pageSize,
    roleFilter,
  ]);

  const isBulkSelection = selectedUserIds.size > 1;
  const rowSendDisabled = isBulkSelection;

  const allPageSelected =
    users.length > 0 && users.every((user) => selectedUserIds.has(user.id));

  const handleToggleAllOnPage = (checked: boolean) => {
    setSelectedUsersById((current) => {
      const next = new Map(current);
      for (const user of users) {
        if (checked) {
          next.set(user.id, user);
        } else {
          next.delete(user.id);
        }
      }
      return next;
    });
  };

  const handleToggleUser = (user: ManagerUserRow, checked: boolean) => {
    setSelectedUsersById((current) => {
      const next = new Map(current);
      if (checked) {
        next.set(user.id, user);
      } else {
        next.delete(user.id);
      }
      return next;
    });
  };

  const openCompose = (
    templateId: EmailTemplateId,
    target: ComposeEmailTarget
  ) => {
    setComposeTemplateId(templateId);
    setComposeTarget(target);
  };

  const openReadyAction = (templateId: EmailTemplateId) => {
    if (selectedWithEmail.length === 0) {
      return;
    }

    openCompose(
      templateId,
      selectedWithEmail.length === 1
        ? { mode: "single", user: selectedWithEmail[0] }
        : { mode: "bulk", users: selectedWithEmail }
    );
  };

  const openCustomToEmailCompose = () => {
    const email = customToEmail.trim();

    if (!email) {
      setCustomToEmailError("Email is required.");
      return;
    }

    if (!EMAIL_REGEX.test(email)) {
      setCustomToEmailError("Please enter a valid email address.");
      return;
    }

    setCustomToEmailError(null);
    openCompose("custom", { mode: "external", email });
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <PanelPageHeader title="Emailing" />
        <div className="flex flex-wrap items-center justify-end gap-2 empty:hidden">
          <Can permission={PERMISSIONS.EMAILING_SEND}>
            <Link
              href={ROUTES.MANAGER_EMAILING_COMPOSE}
              className={cn(buttonVariants({ size: "default" }), "shrink-0")}
            >
              <SparklesIcon data-icon="inline-start" />
              Full customization
            </Link>
          </Can>
        </div>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center gap-2">
              <PenLineIcon className="size-4 text-muted-foreground" />
              Send custom email
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="custom-to-email">Recipient email</Label>
              <div className="flex flex-col gap-2 @lg/panel:flex-row">
                <Input
                  id="custom-to-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={customToEmail}
                  aria-invalid={!!customToEmailError}
                  className="min-w-0 flex-1"
                  onChange={(event) => {
                    setCustomToEmail(event.target.value);
                    if (customToEmailError) {
                      setCustomToEmailError(null);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      openCustomToEmailCompose();
                    }
                  }}
                />
                <Can permission={PERMISSIONS.EMAILING_SEND}>
                  <Button
                    type="button"
                    className="shrink-0"
                    onClick={openCustomToEmailCompose}
                  >
                    <SendIcon data-icon="inline-start" />
                    Compose
                  </Button>
                </Can>
              </div>
              {customToEmailError ? (
                <p className="text-sm text-destructive">{customToEmailError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Send a custom-template email to any address, without selecting
                  a user.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-3">
          <UserStatCard
            label="Total users"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Selected"
            value={selectedUserIds.size}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Students"
            value={stats.students}
            accentClassName="border-l-violet-500"
          />
        </div>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center gap-2">
              <MailIcon className="size-4 text-muted-foreground" />
              Ready actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-3">
            {READY_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <div
                  key={action.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/80 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tracking-tight">
                        {action.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                  </div>
                  <Can permission={PERMISSIONS.EMAILING_SEND}>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canUseReadyActions}
                      className="w-full"
                      onClick={() => openReadyAction(action.id)}
                      title={
                        canUseReadyActions
                          ? undefined
                          : "Select at least one user with an email address"
                      }
                    >
                      Compose
                    </Button>
                  </Can>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <div className="min-w-0">
              <CardTitle>Users</CardTitle>
              <p className="text-sm text-muted-foreground">
                {selectedUserIds.size} of {stats.total} selected
                {selectedUsers.length > 0
                  ? ` · ${selectedWithEmail.length} with email`
                  : ""}
              </p>
            </div>
            {isBulkSelection ? (
              <CardAction className="self-center">
                <Can permission={PERMISSIONS.EMAILING_SEND}>
                  <Button
                    type="button"
                    disabled={selectedWithEmail.length === 0}
                    onClick={() =>
                      openCompose("custom", {
                        mode: "bulk",
                        users: selectedWithEmail,
                      })
                    }
                  >
                    <SendIcon data-icon="inline-start" />
                    Send all
                  </Button>
                </Can>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex flex-col gap-3 border-b px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center">
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search name…"
                  className="pr-8 pl-8"
                  aria-label="Search recipients"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <XIcon className="size-4" />
                  </button>
                ) : null}
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value ?? ROLE_FILTER_ALL);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full @lg/panel:w-44"
                  aria-label="Filter by role"
                >
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ROLE_FILTER_ALL}>All roles</SelectItem>
                  {ROLE_VALUES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {MANAGER_USER_ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={classFilter}
                onValueChange={(value) => {
                  setClassFilter(value ?? CLASS_FILTER_ALL);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full @lg/panel:w-44"
                  aria-label="Filter by class"
                  disabled={isClassMembersPending}
                >
                  <SelectValue placeholder="All classes">
                    {(value) => {
                      if (!value || value === CLASS_FILTER_ALL) {
                        return "All classes";
                      }
                      return (
                        classes.find((classOption) => classOption.id === value)
                          ?.name ?? "All classes"
                      );
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CLASS_FILTER_ALL}>All classes</SelectItem>
                  {classes.map((classOption) => (
                    <SelectItem key={classOption.id} value={classOption.id}>
                      {classOption.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  if (!value) {
                    return;
                  }
                  setPageSize(Number(value) as PageSizeOption);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger
                  className="w-full @lg/panel:w-36"
                  aria-label="Rows per page"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadError ? (
              <div className="m-4 flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-destructive">
                  Unable to load recipients. Check your connection and try again.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() =>
                    loadPage(
                      buildListQuery({
                        page: safeCurrentPage,
                        pageSize,
                      })
                    )
                  }
                >
                  {isLoading ? <InlineSpinner /> : null}
                  Retry
                </Button>
              </div>
            ) : null}

            {isClassMembersPending ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
                <InlineSpinner />
                Loading class members…
              </div>
            ) : users.length === 0 ? (
              <EmptyState
                size="sm"
                className={cn("m-4", isLoading && "opacity-60")}
                icon={stats.total === 0 ? UsersIcon : SearchIcon}
                title={
                  stats.total === 0
                    ? "No users available"
                    : "No users match your filters"
                }
                description={
                  stats.total === 0
                    ? "There are no users to email yet."
                    : "Try a different search or filter."
                }
              />
            ) : (
              <div
                className={cn(
                  "overflow-x-auto",
                  isLoading && "opacity-60 transition-opacity"
                )}
              >
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b bg-muted/40 text-left text-muted-foreground">
                    <tr>
                      <th className="w-12 px-4 py-3 font-medium">
                        <SelectionCheckbox
                          checked={allPageSelected}
                          onCheckedChange={handleToggleAllOnPage}
                          ariaLabel="Select all users on this page"
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">Full name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="w-16 px-4 py-3 text-center font-medium">
                        Message
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const isSelected = selectedUserIds.has(user.id);
                      const displayName = getUserDisplayName(user);
                      const hasEmail = Boolean(user.email);

                      return (
                        <tr
                          key={user.id}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          aria-label={`Select ${displayName}`}
                          className={cn(
                            "cursor-pointer border-b last:border-b-0 transition-colors",
                            isSelected ? "bg-primary/5" : "hover:bg-muted/40"
                          )}
                          onClick={() => handleToggleUser(user, !isSelected)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleToggleUser(user, !isSelected);
                            }
                          }}
                        >
                          <td className="px-4 py-3">
                            <SelectionCheckbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleToggleUser(user, checked)
                              }
                              onClick={(event) => event.stopPropagation()}
                              ariaLabel={`Select ${displayName}`}
                            />
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {displayName}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {user.email || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <UserRoleBadge role={user.role} />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground tabular-nums">
                            {user.created_at
                              ? format(new Date(user.created_at), "MMM d, yyyy")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Can permission={PERMISSIONS.EMAILING_SEND}>
                              <Tooltip>
                                <TooltipTrigger
                                  render={
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      disabled={rowSendDisabled || !hasEmail}
                                      aria-label={`Message ${displayName}`}
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        openCompose("custom", {
                                          mode: "single",
                                          user,
                                        });
                                      }}
                                    />
                                  }
                                >
                                  <MessageSquareIcon className="size-4" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  {rowSendDisabled
                                    ? "Use Send all for multiple recipients"
                                    : !hasEmail
                                      ? "User has no email address"
                                      : "Compose message"}
                                </TooltipContent>
                              </Tooltip>
                            </Can>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {totalCount}
                <span aria-hidden="true"> · </span>
                {pageSize} rows per page
              </p>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={safeCurrentPage <= 1 || isLoading}
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
                      disabled={isLoading}
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
                  disabled={safeCurrentPage >= totalPages || isLoading}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <ComposeEmailDialog
          open={composeTarget !== null}
          onOpenChange={(open) => {
            if (!open) setComposeTarget(null);
          }}
          target={composeTarget}
          initialTemplateId={composeTemplateId}
        />
      </div>
    </TooltipProvider>
  );
}
