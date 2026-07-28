"use client";

import { useMemo, useState, type MouseEvent } from "react";
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
} from "lucide-react";
import {
  ComposeEmailDialog,
  type ComposeEmailTarget,
} from "@/components/manager/emailing/compose-email-dialog";
import { UserRoleBadge } from "@/components/manager/users/user-role-badge";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ROUTES } from "@/lib/constants/routes";
import { MANAGER_USER_ROLE_LABELS } from "@/lib/constants/manager-user-display";
import { EMAIL_REGEX } from "@/lib/validators/auth/fields";
import { ROLE_VALUES, ROLES } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EmailingClassOption } from "@/services/email.service";
import type { ManagerUserRow } from "@/types/manager-user";

type ManageEmailingPanelProps = {
  initialUsers: ManagerUserRow[];
  classes: EmailingClassOption[];
  userClassIds: Record<string, string[]>;
};

type ReadyAction = {
  id: EmailTemplateId;
  title: string;
  description: string;
  icon: typeof SendIcon;
};

const PAGE_SIZE = 30;
const MAX_PAGES = 1000;
const ROLE_FILTER_ALL = "all";
const CLASS_FILTER_ALL = "all";

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
  return user.username ?? user.student_full_name ?? "—";
}

function matchesNameFilter(user: ManagerUserRow, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const username = user.username?.toLowerCase() ?? "";
  const fullName = user.student_full_name?.toLowerCase() ?? "";
  return username.includes(normalized) || fullName.includes(normalized);
}

function matchesEmailFilter(user: ManagerUserRow, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  return user.email.toLowerCase().includes(normalized);
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

export function ManageEmailingPanel({
  initialUsers,
  classes,
  userClassIds,
}: ManageEmailingPanelProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    () => new Set()
  );
  const [composeTarget, setComposeTarget] = useState<ComposeEmailTarget | null>(
    null
  );
  const [composeTemplateId, setComposeTemplateId] =
    useState<EmailTemplateId>("custom");
  const [customToEmail, setCustomToEmail] = useState("");
  const [customToEmailError, setCustomToEmailError] = useState<string | null>(
    null
  );
  const [nameFilter, setNameFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState(ROLE_FILTER_ALL);
  const [classFilter, setClassFilter] = useState(CLASS_FILTER_ALL);
  const [currentPage, setCurrentPage] = useState(1);

  const stats = useMemo(() => {
    const students = initialUsers.filter(
      (user) => user.role === ROLES.STUDENT
    ).length;
    const withEmail = initialUsers.filter((user) => Boolean(user.email)).length;

    return {
      total: initialUsers.length,
      selected: selectedUserIds.size,
      students,
      withEmail,
    };
  }, [initialUsers, selectedUserIds]);

  const selectedUsers = useMemo(
    () => initialUsers.filter((user) => selectedUserIds.has(user.id)),
    [initialUsers, selectedUserIds]
  );

  const selectedWithEmail = useMemo(
    () => selectedUsers.filter((user) => Boolean(user.email)),
    [selectedUsers]
  );

  const canUseReadyActions = selectedWithEmail.length > 0;

  const filteredUsers = useMemo(() => {
    return initialUsers.filter((user) => {
      const matchesRole =
        roleFilter === ROLE_FILTER_ALL || user.role === roleFilter;
      const matchesClass =
        classFilter === CLASS_FILTER_ALL ||
        (userClassIds[user.id] ?? []).includes(classFilter);

      return (
        matchesNameFilter(user, nameFilter) &&
        matchesEmailFilter(user, emailFilter) &&
        matchesRole &&
        matchesClass
      );
    });
  }, [
    classFilter,
    emailFilter,
    initialUsers,
    nameFilter,
    roleFilter,
    userClassIds,
  ]);

  const totalPages = Math.min(
    Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE)),
    MAX_PAGES
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredUsers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredUsers, safeCurrentPage]);

  const rangeStart =
    filteredUsers.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safeCurrentPage * PAGE_SIZE, filteredUsers.length);

  const resetToFirstPage = () => setCurrentPage(1);

  const isBulkSelection = selectedUserIds.size > 1;
  const rowSendDisabled = isBulkSelection;

  const allPageSelected =
    paginatedUsers.length > 0 &&
    paginatedUsers.every((user) => selectedUserIds.has(user.id));

  const handleToggleAllOnPage = (checked: boolean) => {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      for (const user of paginatedUsers) {
        if (checked) {
          next.add(user.id);
        } else {
          next.delete(user.id);
        }
      }
      return next;
    });
  };

  const handleToggleUser = (userId: string, checked: boolean) => {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Emailing</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Select users, pick a template, and send through Mailtrap.
            </p>
          </div>
          <Link
            href={ROUTES.MANAGER_EMAILING_COMPOSE}
            className={cn(buttonVariants({ size: "default" }), "shrink-0")}
          >
            <SparklesIcon data-icon="inline-start" />
            Full customization
          </Link>
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
              <div className="flex flex-col gap-2 sm:flex-row">
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
                <Button
                  type="button"
                  className="shrink-0"
                  onClick={openCustomToEmailCompose}
                >
                  <SendIcon data-icon="inline-start" />
                  Compose
                </Button>
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <UserStatCard
            label="Total users"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Selected"
            value={stats.selected}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Students"
            value={stats.students}
            accentClassName="border-l-violet-500"
          />
          <UserStatCard
            label="With email"
            value={stats.withEmail}
            accentClassName="border-l-amber-500"
          />
        </div>

        <Card className="py-0">
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center gap-2">
              <MailIcon className="size-4 text-muted-foreground" />
              Ready actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
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
                {stats.selected} of {stats.total} selected
                {selectedUsers.length > 0
                  ? ` · ${selectedWithEmail.length} with email`
                  : ""}
              </p>
            </div>
            {isBulkSelection ? (
              <CardAction className="self-center">
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
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="grid gap-3 border-b px-4 pt-2 pb-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative min-w-0">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={nameFilter}
                  onChange={(event) => {
                    setNameFilter(event.target.value);
                    resetToFirstPage();
                  }}
                  placeholder="Filter by name…"
                  className="pl-8"
                  aria-label="Filter by name"
                />
              </div>
              <div className="relative min-w-0">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  inputMode="email"
                  value={emailFilter}
                  onChange={(event) => {
                    setEmailFilter(event.target.value);
                    resetToFirstPage();
                  }}
                  placeholder="Filter by email…"
                  className="pl-8"
                  aria-label="Filter by email"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(value) => {
                  setRoleFilter(value ?? ROLE_FILTER_ALL);
                  resetToFirstPage();
                }}
              >
                <SelectTrigger className="w-full" aria-label="Filter by role">
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
                  resetToFirstPage();
                }}
              >
                <SelectTrigger className="w-full" aria-label="Filter by class">
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
            </div>

            <div className="overflow-x-auto">
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
                    <th className="px-4 py-3 font-medium">Username</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="w-16 px-4 py-3 text-center font-medium">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        {initialUsers.length === 0
                          ? "No users available."
                          : "No users match your filters."}
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
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
                          onClick={() =>
                            handleToggleUser(user.id, !isSelected)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleToggleUser(user.id, !isSelected);
                            }
                          }}
                        >
                          <td className="px-4 py-3">
                            <SelectionCheckbox
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleToggleUser(user.id, checked)
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
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {rangeStart}–{rangeEnd} of {filteredUsers.length}
                {filteredUsers.length !== initialUsers.length
                  ? ` (filtered from ${initialUsers.length})`
                  : ""}
                <span aria-hidden="true"> · </span>
                {PAGE_SIZE} rows per page
              </p>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  disabled={safeCurrentPage <= 1}
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
