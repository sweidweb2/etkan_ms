"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useManagerNotificationsRealtime } from "@/hooks/use-manager-notifications-realtime";
import { ROUTES } from "@/lib/constants/routes";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PanelNotificationsBell() {
  const { unreadCount } = useManagerNotificationsRealtime();
  const label =
    unreadCount > 0
      ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
      : "Notifications";

  return (
    <Link
      href={ROUTES.MANAGER_NOTIFICATIONS}
      prefetch={false}
      aria-label={label}
      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
    >
      <Bell className="size-4" />
      {unreadCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
