"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ArrowUpRightIcon, MessageSquareTextIcon } from "lucide-react";
import { NotificationCategoryBadge } from "@/components/manager/notifications/notification-category-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NOTIFICATION_AUDIENCE_LABELS, NOTIFICATION_PRIORITY_LABELS } from "@/lib/constants/manager-notification-display";
import type { ManagerNotificationRow } from "@/types/manager-notification";

type NotificationDetailsDialogProps = {
  notification: ManagerNotificationRow | null;
  onOpenChange: (open: boolean) => void;
};

export function NotificationDetailsDialog({
  notification,
  onOpenChange,
}: NotificationDetailsDialogProps) {
  return (
    <Dialog
      open={notification !== null}
      onOpenChange={(open) => {
        if (!open) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareTextIcon className="size-4 text-muted-foreground" />
            Notification details
          </DialogTitle>
          <DialogDescription>
            Full information about this notification.
          </DialogDescription>
        </DialogHeader>

        {notification ? (
          <div className="max-h-[min(60vh,28rem)] space-y-4 overflow-y-auto pr-1">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Title
                </dt>
                <dd className="text-sm font-medium text-foreground">
                  {notification.title}
                </dd>
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Message
                </dt>
                <dd className="text-sm text-foreground">{notification.body}</dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Audience
                </dt>
                <dd className="text-sm text-foreground">
                  {NOTIFICATION_AUDIENCE_LABELS[notification.audience]}
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </dt>
                <dd className="text-sm text-foreground">
                  {notification.is_read ? "Read" : "Unread"}
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Category
                </dt>
                <dd>
                  <NotificationCategoryBadge category={notification.category} />
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Priority
                </dt>
                <dd className="text-sm text-foreground">
                  {NOTIFICATION_PRIORITY_LABELS[notification.priority]}
                </dd>
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Action link
                </dt>
                <dd className="break-all text-sm text-foreground">
                  {notification.action_href ?? "—"}
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Created at
                </dt>
                <dd className="text-sm text-foreground">
                  {format(new Date(notification.created_at), "PPpp")}
                </dd>
              </div>

              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Read at
                </dt>
                <dd className="text-sm text-foreground">
                  {notification.read_at
                    ? format(new Date(notification.read_at), "PPpp")
                    : "—"}
                </dd>
              </div>

              <div className="flex flex-col gap-1 sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Notification ID
                </dt>
                <dd className="break-all text-sm text-foreground">
                  {notification.id}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}

        <DialogFooter className="sm:justify-between">
          {notification?.action_href ? (
            <Button
              render={<Link href={notification.action_href} />}
              nativeButton={false}
              variant="outline"
            >
              Open related page
              <ArrowUpRightIcon data-icon="inline-end" />
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
