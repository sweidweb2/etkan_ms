import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { NotificationRecord } from "@/types/notification-record";

type Supabase = SupabaseClient<Database>;

export type NotificationRealtimeHandlers = {
  onInsert?: (notification: NotificationRecord) => void;
  onUpdate?: (notification: NotificationRecord) => void;
  onStatus?: (status: string, err?: Error | null) => void;
};

/**
 * Browser Realtime subscription for notifications INSERT/UPDATE.
 * Callers must pass an authenticated browser Supabase client.
 */
export function subscribeToNotificationChanges(
  client: Supabase,
  handlers: NotificationRealtimeHandlers
) {
  const channel = client
    .channel(`manager-notifications:${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
      },
      (payload) => {
        const row = payload.new as NotificationRecord | null;
        if (row?.id) {
          handlers.onInsert?.(row);
        }
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
      },
      (payload) => {
        const row = payload.new as NotificationRecord | null;
        if (row?.id) {
          handlers.onUpdate?.(row);
        }
      }
    )
    .subscribe((status, err) => {
      handlers.onStatus?.(status, err);
    });

  return () => {
    void client.removeChannel(channel);
  };
}
