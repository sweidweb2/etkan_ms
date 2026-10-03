"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUnreadNotificationCountAction } from "@/app/(panels)/manager/notifications/actions";
import { showInfoToastWithAction } from "@/lib/toast";
import { supabase } from "@/lib/supabase/client";
import {
  subscribeToNotificationChanges,
  type NotificationRecord,
} from "@/repositories/notification.repository";

function isManagerBroadcast(notification: NotificationRecord): boolean {
  return (
    notification.recipient_id == null &&
    (notification.audience === "manager" || notification.audience === "all")
  );
}

export function useManagerNotificationsRealtime() {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const toastedIdsRef = useRef(new Set<string>());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    void getUnreadNotificationCountAction().then((count) => {
      if (!cancelled) {
        setUnreadCount(count);
      }
    });

    const scheduleUnreadRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      refreshTimerRef.current = setTimeout(() => {
        void getUnreadNotificationCountAction().then((count) => {
          if (!cancelled) {
            setUnreadCount(count);
          }
        });
      }, 250);
    };

    const unsubscribe = subscribeToNotificationChanges(supabase, {
      onInsert: (notification) => {
        if (!isManagerBroadcast(notification)) {
          return;
        }

        if (!notification.is_read) {
          setUnreadCount((current) => current + 1);
        }

        if (
          notification.suppress_live_toast ||
          toastedIdsRef.current.has(notification.id)
        ) {
          return;
        }

        toastedIdsRef.current.add(notification.id);

        const href = notification.action_href;
        showInfoToastWithAction(notification.title, {
          description: notification.body,
          actionLabel: href ? "View" : "Open",
          onAction: () => {
            router.push(href ?? "/manager/notifications");
          },
        });
      },
      onUpdate: (notification) => {
        if (!isManagerBroadcast(notification)) {
          return;
        }
        scheduleUnreadRefresh();
      },
    });

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      unsubscribe();
    };
  }, [router]);

  return { unreadCount };
}
