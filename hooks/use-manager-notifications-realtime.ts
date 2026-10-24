"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getUnreadNotificationCountAction } from "@/app/(panels)/manager/notifications/actions";
import { showInfoToastWithAction } from "@/lib/toast";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { subscribeToNotificationChanges } from "@/lib/supabase/notification-realtime";
import type { NotificationRecord } from "@/types/notification-record";

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
    let unsubscribe: (() => void) | null = null;

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

    void getUnreadNotificationCountAction().then((count) => {
      if (!cancelled) {
        setUnreadCount(count);
      }
    });

    void (async () => {
      const client = getBrowserSupabaseClient();
      const {
        data: { session },
      } = await client.auth.getSession();

      if (cancelled) {
        return;
      }

      // Realtime RLS uses the socket JWT. Wire the session before subscribe.
      if (session?.access_token) {
        await client.realtime.setAuth(session.access_token);
      }

      if (cancelled) {
        return;
      }

      unsubscribe = subscribeToNotificationChanges(client, {
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
        onStatus: (status) => {
          if (status === "SUBSCRIBED") {
            scheduleUnreadRefresh();
          }
        },
      });
    })();

    const {
      data: { subscription: authSubscription },
    } = getBrowserSupabaseClient().auth.onAuthStateChange(
      (_event, session) => {
        if (session?.access_token) {
          void getBrowserSupabaseClient().realtime.setAuth(
            session.access_token
          );
        }
      }
    );

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      authSubscription.unsubscribe();
      unsubscribe?.();
    };
  }, [router]);

  return { unreadCount };
}
