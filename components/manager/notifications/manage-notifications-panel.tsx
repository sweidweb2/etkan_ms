"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowUpRightIcon,
  BellIcon,
  CheckCheckIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  GraduationCapIcon,
  InfoIcon,
  MessageSquareTextIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  WrenchIcon,
} from "lucide-react";
import {
  deleteNotificationAction,
  loadNotificationsPageAction,
  markNotificationReadAction,
} from "@/app/manager/notifications/actions";
import { Can } from "@/components/auth/can";
import { AddNotificationDialog } from "@/components/manager/notifications/add-notification-dialog";
import { EditNotificationDialog } from "@/components/manager/notifications/edit-notification-dialog";
import { NotificationDetailsDialog } from "@/components/manager/notifications/notification-details-dialog";
import { NotificationCategoryBadge } from "@/components/manager/notifications/notification-category-badge";
import { NotificationPriorityBadge } from "@/components/manager/notifications/notification-priority-badge";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
  NOTIFICATION_CATEGORY_LABELS,
  NOTIFICATION_CATEGORY_VALUES,
  type NotificationCategoryValue,
} from "@/lib/constants/manager-notification-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { cn } from "@/lib/utils";
import type { ManagerNotificationRow } from "@/types/manager-notification";
import type {
  DeleteNotificationActionState,
  MarkNotificationReadActionState,
} from "@/types/manager-notification";

const initialMarkReadState: MarkNotificationReadActionState = {};
const initialDeleteState: DeleteNotificationActionState = {};

type ManageNotificationsPanelProps = {
  initialNotifications: ManagerNotificationRow[];
  initialTotal: number;
  initialStats: {
    total: number;
    unread: number;
    highPriority: number;
  };
  initialPage: number;
  initialPageSize: number;
};

const PAGE_SIZE_OPTIONS = [5, 8, 12] as const;
const READ_FILTER_ALL = "all";
const READ_FILTER_UNREAD = "unread";
const READ_FILTER_READ = "read";
const CATEGORY_FILTER_ALL = "all";

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

function getCategoryIcon(category: NotificationCategoryValue) {
  switch (category) {
    case "system":
      return SettingsIcon;
    case "academic":
      return GraduationCapIcon;
    case "billing":
      return BellIcon;
    case "equipment":
      return WrenchIcon;
    case "attendance":
      return ClipboardCheckIcon;
    default:
      return InfoIcon;
  }
}

function matchesSearch(notification: ManagerNotificationRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [notification.title, notification.body]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function matchesReadFilter(
  notification: ManagerNotificationRow,
  readFilter: string
) {
  if (readFilter === READ_FILTER_UNREAD) {
    return !notification.is_read;
  }

  if (readFilter === READ_FILTER_READ) {
    return notification.is_read;
  }

  return true;
}

function matchesCategoryFilter(
  notification: ManagerNotificationRow,
  categoryFilter: string
) {
  if (categoryFilter === CATEGORY_FILTER_ALL) {
    return true;
  }

  return notification.category === categoryFilter;
}

export function ManageNotificationsPanel({
  initialNotifications,
  initialTotal,
  initialStats,
  initialPage,
  initialPageSize,
}: ManageNotificationsPanelProps) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [total, setTotal] = useState(initialTotal);
  const [stats, setStats] = useState(initialStats);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [prevNotifications, setPrevNotifications] =
    useState(initialNotifications);
  const [isTransitionPending, startTransition] = useTransition();
  const [markReadState, markReadAction, isMarkReadPending] = useActionState(
    markNotificationReadAction,
    initialMarkReadState
  );
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteNotificationAction,
    initialDeleteState
  );
  const isMarkReadActionPending = isMarkReadPending || isTransitionPending;
  const isDeleteActionPending = isDeletePending || isTransitionPending;

  useActionStateToast(markReadState, isMarkReadActionPending);
  useActionStateToast(deleteState, isDeleteActionPending);

  if (initialNotifications !== prevNotifications) {
    setPrevNotifications(initialNotifications);
    setNotifications(initialNotifications);
    setTotal(initialTotal);
    setStats(initialStats);
  }

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editNotification, setEditNotification] =
    useState<ManagerNotificationRow | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ManagerNotificationRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [readFilter, setReadFilter] = useState(READ_FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(
    initialPageSize as (typeof PAGE_SIZE_OPTIONS)[number]
  );
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [detailsNotification, setDetailsNotification] =
    useState<ManagerNotificationRow | null>(null);

  const [pendingMarkReadId, setPendingMarkReadId] = useState<string | null>(
    null
  );
  const [pendingMarkAllRead, setPendingMarkAllRead] = useState(false);
  const skipInitialPageFetch = useRef(true);

  const handleNotificationCreated = (notification: ManagerNotificationRow) => {
    setNotifications((current) => [notification, ...current]);
    setStats((current) => ({
      total: current.total + 1,
      unread: current.unread + 1,
      highPriority:
        notification.priority === "high"
          ? current.highPriority + 1
          : current.highPriority,
    }));
    setTotal((current) => current + 1);
    setCurrentPage(1);
  };

  const handleNotificationUpdated = (notification: ManagerNotificationRow) => {
    setNotifications((current) =>
      current.map((row) => (row.id === notification.id ? notification : row))
    );
    setEditNotification((current) =>
      current?.id === notification.id ? notification : current
    );
    setDetailsNotification((current) =>
      current?.id === notification.id ? notification : current
    );
  };

  useActionStateSuccess(markReadState, isMarkReadActionPending, () => {
    if (pendingMarkAllRead) {
      setNotifications((current) =>
        current.map((row) => ({
          ...row,
          is_read: true,
          read_at: row.read_at ?? new Date().toISOString(),
        }))
      );
      setPendingMarkAllRead(false);
      return;
    }

    if (pendingMarkReadId) {
      const markedId = pendingMarkReadId;
      setNotifications((current) =>
        current.map((row) =>
          row.id === markedId
            ? { ...row, is_read: true, read_at: new Date().toISOString() }
            : row
        )
      );
      setPendingMarkReadId(null);
    }
  });

  useActionStateSuccess(deleteState, isDeleteActionPending, () => {
    if (deleteTarget) {
      const removedId = deleteTarget.id;
      setNotifications((current) =>
        current.filter((row) => row.id !== removedId)
      );
    }
    setDeleteTarget(null);
    setDetailsNotification(null);
  });

  const handleDeleteOpenChange = usePendingAwareOpenChange(
    isDeleteActionPending,
    (nextOpen) => {
      if (!nextOpen) {
        setDeleteTarget(null);
      }
    }
  );

  useEffect(() => {
    if (skipInitialPageFetch.current) {
      skipInitialPageFetch.current = false;
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setIsPageLoading(true);

      void loadNotificationsPageAction({
        page: currentPage,
        pageSize,
        readFilter,
        category: categoryFilter,
        search: searchQuery,
      }).then((pageData) => {
        if (cancelled) {
          return;
        }

        setNotifications(pageData.notifications);
        setTotal(pageData.total);
        setStats(pageData.stats);
        setIsPageLoading(false);
      });
    }, searchQuery.trim() ? 250 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [categoryFilter, currentPage, pageSize, readFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedNotifications = notifications;

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart = total === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrentPage * pageSize, total);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleReadFilterChange = (value: string | null) => {
    setReadFilter(value ?? READ_FILTER_ALL);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (value: string | null) => {
    setCategoryFilter(value ?? CATEGORY_FILTER_ALL);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (value: string | null) => {
    if (!value) {
      return;
    }

    setPageSize(Number(value) as (typeof PAGE_SIZE_OPTIONS)[number]);
    setCurrentPage(1);
  };

  const handleMarkAsRead = (notificationId: string) => {
    setPendingMarkReadId(notificationId);
    const formData = new FormData();
    formData.set("id", notificationId);

    startTransition(() => {
      markReadAction(formData);
    });
  };

  const handleMarkAllAsRead = () => {
    setPendingMarkAllRead(true);
    const formData = new FormData();
    formData.set("mark_all", "true");

    startTransition(() => {
      markReadAction(formData);
    });
  };

  const handleEditNotification = (notification: ManagerNotificationRow) => {
    setEditNotification(notification);
    setIsEditOpen(true);
  };

  const handleRequestDelete = (notification: ManagerNotificationRow) => {
    setDeleteTarget(notification);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    const formData = new FormData();
    formData.set("id", deleteTarget.id);

    startTransition(() => {
      deleteAction(formData);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review school updates, alerts, and system messages.
          </p>
        </div>
        <Can permission={PERMISSIONS.NOTIFICATIONS_CREATE}>
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Create notification
          </Button>
        </Can>
      </div>

      <AddNotificationDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onNotificationCreated={handleNotificationCreated}
      />

      <EditNotificationDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        notification={editNotification}
        onNotificationUpdated={handleNotificationUpdated}
      />

      <NotificationDetailsDialog
        notification={detailsNotification}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsNotification(null);
          }
        }}
        onEdit={handleEditNotification}
        onDelete={handleRequestDelete}
        isDeletePending={isDeleteActionPending}
      />

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isDeleteActionPending}>
          <DialogHeader>
            <DialogTitle>Delete notification</DialogTitle>
            <DialogDescription>
              This will permanently remove &quot;{deleteTarget?.title}&quot;. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleDeleteOpenChange(false)}
              disabled={isDeleteActionPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleteActionPending}
            >
              {isDeleteActionPending ? (
                <>
                  <InlineSpinner />
                  Deleting notification
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <UserStatCard
          label="Total notifications"
          value={stats.total}
          accentClassName="border-l-sky-500"
        />
        <UserStatCard
          label="Unread"
          value={stats.unread}
          accentClassName="border-l-amber-500"
        />
        <UserStatCard
          label="High priority"
          value={stats.highPriority}
          accentClassName="border-l-rose-500"
        />
      </div>

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Inbox</CardTitle>
          <CardDescription>
            Filter by status or category, then open linked pages when available.
          </CardDescription>
          <CardAction className="self-center">
            <Can permission={PERMISSIONS.NOTIFICATIONS_MARK_READ}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                disabled={stats.unread === 0 || isMarkReadActionPending}
              >
                <CheckCheckIcon data-icon="inline-start" />
                Mark all read
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
                placeholder="Search title or message…"
                className="pl-8"
                aria-label="Search notifications"
              />
            </div>
            <Select value={readFilter} onValueChange={handleReadFilterChange}>
              <SelectTrigger
                className="w-full sm:w-36"
                aria-label="Filter by read status"
              >
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={READ_FILTER_ALL}>All statuses</SelectItem>
                <SelectItem value={READ_FILTER_UNREAD}>Unread</SelectItem>
                <SelectItem value={READ_FILTER_READ}>Read</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
              <SelectTrigger
                className="w-full sm:w-40"
                aria-label="Filter by category"
              >
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={CATEGORY_FILTER_ALL}>All categories</SelectItem>
                {NOTIFICATION_CATEGORY_VALUES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {NOTIFICATION_CATEGORY_LABELS[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paginatedNotifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No notifications match your filters.
            </div>
          ) : (
            <div className="divide-y">
              {paginatedNotifications.map((notification) => {
                const CategoryIcon = getCategoryIcon(notification.category);
                const createdAt = new Date(notification.created_at);

                return (
                  <article
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailsNotification(notification)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setDetailsNotification(notification);
                      }
                    }}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 px-4 pt-2 pb-3 transition-colors hover:bg-muted/30",
                      !notification.is_read && "bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 shrink-0 rounded-full p-2",
                        notification.is_read
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      <CategoryIcon className="size-4" aria-hidden />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          {!notification.is_read ? (
                            <span
                              className="size-2 shrink-0 rounded-full bg-primary"
                              aria-label="Unread"
                            />
                          ) : null}
                          <h2
                            className={cn(
                              "font-medium",
                              !notification.is_read && "text-foreground"
                            )}
                          >
                            {notification.title}
                          </h2>
                          <NotificationCategoryBadge
                            category={notification.category}
                          />
                          <NotificationPriorityBadge
                            priority={notification.priority}
                          />
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="View notification details"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDetailsNotification(notification);
                            }}
                            className="text-primary hover:bg-primary/10 hover:text-primary"
                          >
                            <MessageSquareTextIcon className="size-4" />
                          </Button>
                          <time
                            dateTime={notification.created_at}
                            className="text-xs text-muted-foreground"
                            title={format(createdAt, "PPpp")}
                          >
                            {formatDistanceToNow(createdAt, { addSuffix: true })}
                          </time>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {notification.action_href ? (
                          <Button
                            render={
                              <Link href={notification.action_href} />
                            }
                            nativeButton={false}
                            variant="outline"
                            size="xs"
                            onClick={(event) => event.stopPropagation()}
                          >
                            Open related page
                            <ArrowUpRightIcon data-icon="inline-end" />
                          </Button>
                        ) : null}
                        {!notification.is_read ? (
                          <Can permission={PERMISSIONS.NOTIFICATIONS_MARK_READ}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              disabled={isMarkReadActionPending}
                            >
                              <CheckIcon data-icon="inline-start" />
                              Mark as read
                            </Button>
                          </Can>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Read{" "}
                            {notification.read_at
                              ? format(
                                  new Date(notification.read_at),
                                  "MMM d, yyyy h:mm a"
                                )
                              : "—"}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                Showing {rangeStart}–{rangeEnd} of {total}
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
  );
}
