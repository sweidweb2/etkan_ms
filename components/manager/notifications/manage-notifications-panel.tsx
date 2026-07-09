"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
import { AddNotificationDialog } from "@/components/manager/notifications/add-notification-dialog";
import { NotificationDetailsDialog } from "@/components/manager/notifications/notification-details-dialog";
import { NotificationCategoryBadge } from "@/components/manager/notifications/notification-category-badge";
import { NotificationPriorityBadge } from "@/components/manager/notifications/notification-priority-badge";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { Button } from "@/components/ui/button";
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
import { MANAGER_NOTIFICATIONS_MOCK } from "@/lib/constants/manager-notifications-mock";
import { cn } from "@/lib/utils";
import type { ManagerNotificationRow } from "@/types/manager-notification";

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

export function ManageNotificationsPanel() {
  const [notifications, setNotifications] = useState(MANAGER_NOTIFICATIONS_MOCK);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [readFilter, setReadFilter] = useState(READ_FILTER_ALL);
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_FILTER_ALL);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(8);
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsNotification, setDetailsNotification] =
    useState<ManagerNotificationRow | null>(null);

  const stats = useMemo(
    () => ({
      total: notifications.length,
      unread: notifications.filter((notification) => !notification.is_read).length,
      highPriority: notifications.filter(
        (notification) => notification.priority === "high"
      ).length,
    }),
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification) => {
      return (
        matchesSearch(notification, searchQuery) &&
        matchesReadFilter(notification, readFilter) &&
        matchesCategoryFilter(notification, categoryFilter)
      );
    });
  }, [categoryFilter, notifications, readFilter, searchQuery]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredNotifications.length / pageSize)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedNotifications = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredNotifications.slice(startIndex, startIndex + pageSize);
  }, [filteredNotifications, pageSize, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredNotifications.length === 0
      ? 0
      : (safeCurrentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * pageSize,
    filteredNotifications.length
  );

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
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              is_read: true,
              read_at: new Date().toISOString(),
            }
          : notification
      )
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((currentNotifications) =>
      currentNotifications.map((notification) =>
        notification.is_read
          ? notification
          : {
              ...notification,
              is_read: true,
              read_at: new Date().toISOString(),
            }
      )
    );
  };

  const handleCreateNotification = (notification: ManagerNotificationRow) => {
    setNotifications((currentNotifications) => [
      notification,
      ...currentNotifications,
    ]);
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review school updates, alerts, and system messages. Data is mocked until
            backend is connected.
          </p>
        </div>
        <Button type="button" onClick={() => setIsCreateOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          Create notification
        </Button>
      </div>

      <AddNotificationDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreateNotification={handleCreateNotification}
      />

      <NotificationDetailsDialog
        notification={detailsNotification}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsNotification(null);
          }
        }}
      />

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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={stats.unread === 0}
            >
              <CheckCheckIcon data-icon="inline-start" />
              Mark all read
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                          >
                            <CheckIcon data-icon="inline-start" />
                            Mark as read
                          </Button>
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
                Showing {rangeStart}–{rangeEnd} of {filteredNotifications.length}
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
