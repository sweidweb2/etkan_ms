"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MailIcon,
  MegaphoneIcon,
  MessageSquareIcon,
  PenLineIcon,
  SendIcon,
} from "lucide-react";
import { UserRoleBadge } from "@/components/manager/users/user-role-badge";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ROLES } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import type { ManagerUserRow } from "@/types/manager-user";

type ManageEmailingPanelProps = {
  initialUsers: ManagerUserRow[];
};

type ReadyAction = {
  id: string;
  title: string;
  description: string;
  icon: typeof SendIcon;
};

type ComposeTarget =
  | { mode: "single"; user: ManagerUserRow }
  | { mode: "bulk"; users: ManagerUserRow[] };

const PAGE_SIZE = 30;
const MAX_PAGES = 1000;

const READY_ACTIONS: ReadyAction[] = [
  {
    id: "announcement",
    title: "Send announcement",
    description: "Broadcast a message to the selected users.",
    icon: MegaphoneIcon,
  },
  {
    id: "reminder",
    title: "Send reminder",
    description: "Nudge selected users about an upcoming item.",
    icon: SendIcon,
  },
  {
    id: "custom",
    title: "Custom campaign",
    description: "Compose a custom email for the selected group.",
    icon: PenLineIcon,
  },
];

const TEXTAREA_CLASS =
  "min-h-32 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";

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

function ComposeEmailDialog({
  open,
  onOpenChange,
  target,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ComposeTarget | null;
}) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const isBulk = target?.mode === "bulk";
  const recipientLabel = !target
    ? ""
    : target.mode === "single"
      ? `${getUserDisplayName(target.user)} (${target.user.email || "no email"})`
      : `${target.users.length} selected users`;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSubject("");
      setBody("");
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isBulk ? "Send email to selected" : "Send email"}
          </DialogTitle>
          <DialogDescription>
            Compose a message for {recipientLabel}. Sending will be enabled
            later.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email-subject">Title</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Email subject"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email-body">Email body</Label>
            <textarea
              id="email-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Write your message…"
              className={TEXTAREA_CLASS}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled title="Sending will be enabled later">
            <SendIcon data-icon="inline-start" />
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ManageEmailingPanel({ initialUsers }: ManageEmailingPanelProps) {
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    () => new Set()
  );
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(
    null
  );
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

  const totalPages = Math.min(
    Math.max(1, Math.ceil(initialUsers.length / PAGE_SIZE)),
    MAX_PAGES
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);

  const paginatedUsers = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return initialUsers.slice(startIndex, startIndex + PAGE_SIZE);
  }, [initialUsers, safeCurrentPage]);

  const rangeStart =
    initialUsers.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safeCurrentPage * PAGE_SIZE, initialUsers.length);

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

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Emailing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select users and prepare email actions. Sending will be enabled
            later.
          </p>
        </div>

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
                    disabled
                    className="w-full"
                  >
                    Coming soon
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
              </p>
            </div>
            {isBulkSelection ? (
              <CardAction className="self-center">
                <Button
                  type="button"
                  onClick={() =>
                    setComposeTarget({ mode: "bulk", users: selectedUsers })
                  }
                >
                  <SendIcon data-icon="inline-start" />
                  Send all
                </Button>
              </CardAction>
            ) : null}
          </CardHeader>
          <CardContent className="px-0 pb-0">
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
                        No users available.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const isSelected = selectedUserIds.has(user.id);
                      const displayName = getUserDisplayName(user);

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
                                    disabled={rowSendDisabled}
                                    aria-label={`Message ${displayName}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setComposeTarget({
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
                Showing {rangeStart}–{rangeEnd} of {initialUsers.length}
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
        />
      </div>
    </TooltipProvider>
  );
}
