import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const NOTIFICATION_COLUMNS =
  "id, recipient_id, audience, category, priority, title, body, action_href, is_read, read_at, created_by, created_at, suppress_live_toast";

export type NotificationRecord = {
  id: string;
  recipient_id: string | null;
  audience: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  action_href: string | null;
  is_read: boolean;
  read_at: string | null;
  created_by: string | null;
  created_at: string;
  suppress_live_toast: boolean;
};

export type CreateNotificationRecordInput = {
  recipient_id?: string | null;
  audience: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  action_href?: string | null;
  created_by?: string | null;
  suppress_live_toast?: boolean;
};

export type UpdateNotificationRecordInput = {
  audience: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  action_href?: string | null;
};

export type NotificationListFilters = {
  isRead?: "all" | "read" | "unread";
  category?: string | null;
  search?: string | null;
};

export type ListNotificationsOptions = NotificationListFilters & {
  limit: number;
  offset: number;
};

export async function listNotifications(
  client: Supabase,
  options: ListNotificationsOptions
) {
  const from = options.offset;
  const to = options.offset + options.limit - 1;

  let query = client
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .order("created_at", { ascending: false });

  if (options.isRead === "read") {
    query = query.eq("is_read", true);
  } else if (options.isRead === "unread") {
    query = query.eq("is_read", false);
  }

  if (options.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  const search = options.search?.trim();
  if (search) {
    const escaped = search.replace(/[%_,]/g, "");
    if (escaped) {
      query = query.or(`title.ilike.%${escaped}%,body.ilike.%${escaped}%`);
    }
  }

  return query.range(from, to);
}

export async function countNotifications(
  client: Supabase,
  filters: NotificationListFilters = {}
) {
  let query = client
    .from("notifications")
    .select("id", { count: "exact", head: true });

  if (filters.isRead === "read") {
    query = query.eq("is_read", true);
  } else if (filters.isRead === "unread") {
    query = query.eq("is_read", false);
  }

  if (filters.category && filters.category !== "all") {
    query = query.eq("category", filters.category);
  }

  const search = filters.search?.trim();
  if (search) {
    const escaped = search.replace(/[%_,]/g, "");
    if (escaped) {
      query = query.or(`title.ilike.%${escaped}%,body.ilike.%${escaped}%`);
    }
  }

  return query;
}

export async function countUnreadNotifications(client: Supabase) {
  return client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("is_read", false);
}

export async function countHighPriorityNotifications(client: Supabase) {
  return client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("priority", "high");
}

export async function findNotificationById(client: Supabase, id: string) {
  return client
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createNotification(
  client: Supabase,
  input: CreateNotificationRecordInput
) {
  return client
    .from("notifications")
    .insert({
      recipient_id: input.recipient_id ?? null,
      audience: input.audience,
      category: input.category,
      priority: input.priority,
      title: input.title,
      body: input.body,
      action_href: input.action_href ?? null,
      created_by: input.created_by ?? null,
      suppress_live_toast: input.suppress_live_toast ?? false,
    })
    .select(NOTIFICATION_COLUMNS)
    .single();
}

export async function updateNotification(
  client: Supabase,
  id: string,
  input: UpdateNotificationRecordInput
) {
  return client
    .from("notifications")
    .update({
      audience: input.audience,
      category: input.category,
      priority: input.priority,
      title: input.title,
      body: input.body,
      action_href: input.action_href ?? null,
    })
    .eq("id", id)
    .select(NOTIFICATION_COLUMNS)
    .single();
}

export async function markNotificationRead(client: Supabase, id: string) {
  const readAt = new Date().toISOString();

  return client
    .from("notifications")
    .update({
      is_read: true,
      read_at: readAt,
    })
    .eq("id", id)
    .select(NOTIFICATION_COLUMNS)
    .single();
}

export async function markAllNotificationsRead(client: Supabase) {
  const readAt = new Date().toISOString();

  return client
    .from("notifications")
    .update({
      is_read: true,
      read_at: readAt,
    })
    .eq("is_read", false)
    .select("id");
}

export async function deleteNotificationById(client: Supabase, id: string) {
  return client.from("notifications").delete().eq("id", id);
}

export type NotificationRealtimeHandlers = {
  onInsert?: (notification: NotificationRecord) => void;
  onUpdate?: (notification: NotificationRecord) => void;
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
    .channel("manager-notifications")
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
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
