"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRightIcon,
  CheckIcon,
  ChevronDownIcon,
} from "lucide-react";
import {
  loadNotificationsPageAction,
  markNotificationReadAction,
} from "@/app/manager/notifications/actions";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActionStateSuccess } from "@/hooks/use-action-state-success";
import { useActionStateToast } from "@/hooks/use-action-state-toast";
import { useFormActionState } from "@/hooks/use-form-action-state";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { cn } from "@/lib/utils";
import type {
  ManagerNotificationRow,
  MarkNotificationReadActionState,
} from "@/types/manager-notification";

const initialMarkReadState: MarkNotificationReadActionState = {};
const PAGE_SIZE = 25;

type GuestRegistrationNotificationsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnreadCountChange?: (count: number) => void;
};

export function GuestRegistrationNotificationsSheet({
  open,
  onOpenChange,
  onUnreadCountChange,
}: GuestRegistrationNotificationsSheetProps) {
  const [notifications, setNotifications] = useState<ManagerNotificationRow[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [pendingReadId, setPendingReadId] = useState<string | null>(null);
  const [markReadState, markReadAction, isMarkReadPending] = useFormActionState(
    markNotificationReadAction,
    initialMarkReadState
  );

  useActionStateToast(markReadState, isMarkReadPending);
  useActionStateSuccess(markReadState, isMarkReadPending, () => {
    const id = pendingReadId;
    if (!id) {
      return;
    }
    setNotifications((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, is_read: true, read_at: new Date().toISOString() }
          : row
      )
    );
    setPendingReadId(null);
    void loadNotificationsPageAction({
      page: 1,
      pageSize: 1,
      category: "registration",
      readFilter: "unread",
    }).then((page) => {
      onUnreadCountChange?.(page.total);
    });
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    void Promise.all([
      loadNotificationsPageAction({
        page: 1,
        pageSize: PAGE_SIZE,
        category: "registration",
        readFilter: "all",
      }),
      loadNotificationsPageAction({
        page: 1,
        pageSize: 1,
        category: "registration",
        readFilter: "unread",
      }),
    ]).then(([page, unreadPage]) => {
      if (cancelled) {
        return;
      }
      setNotifications(page.notifications);
      onUnreadCountChange?.(unreadPage.total);
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, onUnreadCountChange]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleMarkRead(id: string) {
    const formData = new FormData();
    formData.set("id", id);
    setPendingReadId(id);
    markReadAction(formData);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader className="border-b">
          <SheetTitle>Registration notifications</SheetTitle>
          <SheetDescription>
            Latest registration alerts for guest intake follow-up.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <InlineSpinner />
              Loading…
            </div>
          ) : notifications.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No registration notifications yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {notifications.map((notification) => {
                const expanded = expandedIds.has(notification.id);
                const isReading =
                  isMarkReadPending && pendingReadId === notification.id;

                return (
                  <li
                    key={notification.id}
                    className={cn(
                      "overflow-hidden rounded-xl border bg-card",
                      !notification.is_read && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start gap-2 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          {!notification.is_read ? (
                            <span
                              className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                              aria-label="Unread"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-snug">
                              {notification.title}
                            </p>
                            <time
                              dateTime={notification.created_at}
                              className="mt-1 block text-xs text-muted-foreground"
                            >
                              {formatDistanceToNow(
                                new Date(notification.created_at),
                                { addSuffix: true }
                              )}
                            </time>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {!notification.is_read ? (
                          <Can
                            permission={PERMISSIONS.NOTIFICATIONS_MARK_READ}
                          >
                            <Button
                              type="button"
                              variant="outline"
                              size="xs"
                              disabled={isReading}
                              onClick={() => handleMarkRead(notification.id)}
                            >
                              {isReading ? <InlineSpinner /> : <CheckIcon />}
                              Read
                            </Button>
                          </Can>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-expanded={expanded}
                          aria-label={
                            expanded
                              ? "Hide notification details"
                              : "Show notification details"
                          }
                          onClick={() => toggleExpanded(notification.id)}
                        >
                          <ChevronDownIcon
                            className={cn(
                              "size-4 transition-transform duration-200",
                              expanded && "rotate-180"
                            )}
                          />
                        </Button>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="space-y-3 border-t bg-muted/30 px-3 py-3">
                        <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                          {notification.body}
                        </p>
                        {notification.action_href ? (
                          <Button
                            render={
                              <Link href={notification.action_href} />
                            }
                            nativeButton={false}
                            variant="outline"
                            size="xs"
                            onClick={() => onOpenChange(false)}
                          >
                            Open registration
                            <ArrowUpRightIcon data-icon="inline-end" />
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
