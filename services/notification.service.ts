import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { NOTIFICATION_ACTION_NONE_VALUE } from "@/lib/validators/manager/create-notification";
import { createNotificationSchema } from "@/lib/validators/manager/create-notification";
import { updateNotificationSchema } from "@/lib/validators/manager/update-notification";
import * as notificationRepository from "@/repositories/notification.repository";
import type { NotificationRecord } from "@/repositories/notification.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type {
  NotificationAudienceValue,
  NotificationCategoryValue,
  NotificationPriorityValue,
} from "@/lib/constants/manager-notification-display";
import type { ManagerNotificationRow } from "@/types/manager-notification";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type CreateNotificationSuccess = {
  success: true;
  notification: ManagerNotificationRow;
  message: string;
};

export type CreateNotificationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type CreateNotificationResult =
  | CreateNotificationSuccess
  | CreateNotificationFailure;

export type UpdateNotificationSuccess = {
  success: true;
  notification: ManagerNotificationRow;
  message: string;
};

export type UpdateNotificationFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

export type UpdateNotificationResult =
  | UpdateNotificationSuccess
  | UpdateNotificationFailure;

export type MarkNotificationReadSuccess = {
  success: true;
  message: string;
};

export type MarkNotificationReadFailure = {
  success: false;
  error: string;
};

export type MarkNotificationReadResult =
  | MarkNotificationReadSuccess
  | MarkNotificationReadFailure;

export type DeleteNotificationSuccess = {
  success: true;
  message: string;
};

export type DeleteNotificationFailure = {
  success: false;
  error: string;
};

export type DeleteNotificationResult =
  | DeleteNotificationSuccess
  | DeleteNotificationFailure;

function assertManagerRole(actorRole: RoleValue | null): void {
  if (actorRole !== ROLES.MANAGER) {
    throw new Error("Unauthorized.");
  }
}

function normalizeActionHref(actionHref?: string | null): string | null {
  if (!actionHref || actionHref === NOTIFICATION_ACTION_NONE_VALUE) {
    return null;
  }

  return actionHref;
}

function mapNotificationRecordToRow(
  record: NotificationRecord
): ManagerNotificationRow {
  return {
    id: record.id,
    recipient_id: record.recipient_id,
    audience: record.audience as NotificationAudienceValue,
    category: record.category as NotificationCategoryValue,
    priority: record.priority as NotificationPriorityValue,
    title: record.title,
    body: record.body,
    action_href: record.action_href,
    is_read: record.is_read,
    read_at: record.read_at,
    created_by: record.created_by,
    created_at: record.created_at,
  };
}

function mapCreateNotificationError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("check")) {
    return "Notification values are invalid.";
  }

  return "Unable to create notification. Please try again.";
}

function mapUpdateNotificationError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("check")) {
    return "Notification values are invalid.";
  }

  return "Unable to update notification. Please try again.";
}

export async function listNotificationsForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null
): Promise<ManagerNotificationRow[]> {
  assertManagerRole(actorRole);

  const { data, error } = await notificationRepository.listNotifications(
    adminClient
  );

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(mapNotificationRecordToRow);
}

export async function createNotificationForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    title: string;
    body: string;
    audience: string;
    category: string;
    priority: string;
    action_href?: string | null;
  }
): Promise<CreateNotificationResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = createNotificationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { title, body, audience, category, priority, action_href } = parsed.data;

  const { data, error } = await notificationRepository.createNotification(
    adminClient,
    {
      recipient_id: null,
      audience,
      category,
      priority,
      title: title.trim(),
      body: body.trim(),
      action_href: normalizeActionHref(action_href),
      created_by: actor.userId,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapCreateNotificationError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "notifications",
    record_id: data.id,
    new_data: {
      title: data.title,
      audience: data.audience,
      category: data.category,
      priority: data.priority,
      action_href: data.action_href,
    },
    metadata: { note: "Notification created." },
  });

  return {
    success: true,
    notification: mapNotificationRecordToRow(data),
    message: "Notification created.",
  };
}

export async function updateNotificationForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    id: string;
    title: string;
    body: string;
    audience: string;
    category: string;
    priority: string;
    action_href?: string | null;
  }
): Promise<UpdateNotificationResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = updateNotificationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await notificationRepository.findNotificationById(
    adminClient,
    parsed.data.id
  );

  if (existing.error) {
    return {
      success: false,
      error: mapUpdateNotificationError(existing.error.message),
    };
  }

  if (!existing.data) {
    return { success: false, error: "Notification not found." };
  }

  const { id, title, body, audience, category, priority, action_href } =
    parsed.data;

  const { data, error } = await notificationRepository.updateNotification(
    adminClient,
    id,
    {
      audience,
      category,
      priority,
      title: title.trim(),
      body: body.trim(),
      action_href: normalizeActionHref(action_href),
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: mapUpdateNotificationError(error?.message ?? "Unknown error"),
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "notifications",
    record_id: data.id,
    old_data: {
      title: existing.data.title,
      audience: existing.data.audience,
      category: existing.data.category,
      priority: existing.data.priority,
      action_href: existing.data.action_href,
    },
    new_data: {
      title: data.title,
      audience: data.audience,
      category: data.category,
      priority: data.priority,
      action_href: data.action_href,
    },
    metadata: {
      note: "Notification updated.",
      changed_fields: ["title", "body", "audience", "category", "priority", "action_href"],
    },
  });

  return {
    success: true,
    notification: mapNotificationRecordToRow(data),
    message: "Notification updated.",
  };
}

export async function markNotificationReadForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: { id?: string; mark_all?: boolean }
): Promise<MarkNotificationReadResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  if (input.mark_all) {
    const { error } = await notificationRepository.markAllNotificationsRead(
      adminClient
    );

    if (error) {
      return {
        success: false,
        error: "Unable to mark notifications as read. Please try again.",
      };
    }

    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "info",
      table_name: "notifications",
      metadata: { note: "All notifications marked as read." },
    });

    return { success: true, message: "All notifications marked as read." };
  }

  if (!input.id) {
    return { success: false, error: "Notification id is required." };
  }

  const existing = await notificationRepository.findNotificationById(
    adminClient,
    input.id
  );

  if (existing.error) {
    return {
      success: false,
      error: "Unable to mark notification as read. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Notification not found." };
  }

  if (existing.data.is_read) {
    return { success: true, message: "Notification already marked as read." };
  }

  const { error } = await notificationRepository.markNotificationRead(
    adminClient,
    input.id
  );

  if (error) {
    return {
      success: false,
      error: "Unable to mark notification as read. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "notifications",
    record_id: input.id,
    old_data: { is_read: false },
    new_data: { is_read: true },
    metadata: { note: "Notification marked as read.", changed_fields: ["is_read"] },
  });

  return { success: true, message: "Notification marked as read." };
}

export async function deleteNotificationForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  notificationId: string
): Promise<DeleteNotificationResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const existing = await notificationRepository.findNotificationById(
    adminClient,
    notificationId
  );

  if (existing.error) {
    return {
      success: false,
      error: "Unable to delete notification. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Notification not found." };
  }

  const { error } = await notificationRepository.deleteNotificationById(
    adminClient,
    notificationId
  );

  if (error) {
    return {
      success: false,
      error: "Unable to delete notification. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "critical",
    table_name: "notifications",
    record_id: notificationId,
    old_data: {
      title: existing.data.title,
      audience: existing.data.audience,
      category: existing.data.category,
      priority: existing.data.priority,
    },
    metadata: { note: "Notification deleted." },
  });

  return { success: true, message: "Notification deleted." };
}
