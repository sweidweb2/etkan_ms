import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const NOTIFICATION_COLUMNS =
  "id, recipient_id, audience, category, priority, title, body, action_href, is_read, read_at, created_by, created_at";

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
};

export type UpdateNotificationRecordInput = {
  audience: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  action_href?: string | null;
};

export async function listNotifications(client: Supabase) {
  return client
    .from("notifications")
    .select(NOTIFICATION_COLUMNS)
    .order("created_at", { ascending: false });
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
