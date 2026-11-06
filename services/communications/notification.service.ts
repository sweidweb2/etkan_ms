import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  assertPermission,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { NOTIFICATION_ACTION_NONE_VALUE } from "@/lib/validators/manager/create-notification";
import { createNotificationSchema } from "@/lib/validators/manager/create-notification";
import { updateNotificationSchema } from "@/lib/validators/manager/update-notification";
import {
  getManagerClassDetailRoute,
  getManagerRegistrationDetailRoute,
} from "@/lib/constants/routes";
import * as notificationRepository from "@/repositories/notification.repository";
import type { NotificationRecord } from "@/types/notification-record";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
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
    suppress_live_toast: record.suppress_live_toast,
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
  actorUserId: string | null
): Promise<ManagerNotificationRow[]> {
  const page = await listNotificationsPageForManager(
    adminClient,
    actorUserId,
    { page: 1, pageSize: 100 }
  );

  return page.notifications;
}

export type ManagerNotificationsPageStats = {
  total: number;
  unread: number;
  highPriority: number;
};

export type ManagerNotificationsPage = {
  notifications: ManagerNotificationRow[];
  total: number;
  page: number;
  pageSize: number;
  stats: ManagerNotificationsPageStats;
};

export async function listNotificationsPageForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  input: {
    page?: number;
    pageSize?: number;
    readFilter?: string;
    category?: string;
    search?: string;
  } = {}
): Promise<ManagerNotificationsPage> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.NOTIFICATIONS_VIEW);

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 8));
  const offset = (page - 1) * pageSize;

  const readFilter =
    input.readFilter === "read" || input.readFilter === "unread"
      ? input.readFilter
      : "all";

  const filters = {
    isRead: readFilter as "all" | "read" | "unread",
    category: input.category ?? "all",
    search: input.search ?? null,
  };

  const [listResult, filteredTotalResult, globalTotalResult, unreadResult, highPriorityResult] =
    await Promise.all([
      notificationRepository.listNotifications(adminClient, {
        ...filters,
        limit: pageSize,
        offset,
      }),
      notificationRepository.countNotifications(adminClient, filters),
      notificationRepository.countNotifications(adminClient, {}),
      notificationRepository.countUnreadNotifications(adminClient),
      notificationRepository.countHighPriorityNotifications(adminClient),
    ]);

  if (listResult.error) {
    throw new Error(listResult.error.message);
  }

  if (filteredTotalResult.error) {
    throw new Error(filteredTotalResult.error.message);
  }

  if (globalTotalResult.error) {
    throw new Error(globalTotalResult.error.message);
  }

  if (unreadResult.error) {
    throw new Error(unreadResult.error.message);
  }

  if (highPriorityResult.error) {
    throw new Error(highPriorityResult.error.message);
  }

  return {
    notifications: (listResult.data ?? []).map(mapNotificationRecordToRow),
    total: filteredTotalResult.count ?? 0,
    page,
    pageSize,
    stats: {
      total: globalTotalResult.count ?? 0,
      unread: unreadResult.count ?? 0,
      highPriority: highPriorityResult.count ?? 0,
    },
  };
}

export async function createNotificationForManager(
  adminClient: Supabase,
  actorUserId: string | null,
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
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.NOTIFICATIONS_CREATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
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
  actorUserId: string | null,
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
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.NOTIFICATIONS_UPDATE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
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
  actorUserId: string | null,
  actor: AuditActor,
  input: { id?: string; mark_all?: boolean }
): Promise<MarkNotificationReadResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.NOTIFICATIONS_MARK_READ);
  if (unauthorized) {
    return { success: false, error: unauthorized };
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
  actorUserId: string | null,
  actor: AuditActor,
  notificationId: string
): Promise<DeleteNotificationResult> {
  const unauthorized = await getUnauthorizedError(adminClient, actorUserId, PERMISSIONS.NOTIFICATIONS_DELETE);
  if (unauthorized) {
    return { success: false, error: unauthorized };
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

export async function getUnreadNotificationCountForManager(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<number> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.NOTIFICATIONS_VIEW
  );

  const { count, error } =
    await notificationRepository.countUnreadNotifications(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

/**
 * System event: guest/public registration submitted.
 * Does not require NOTIFICATIONS_CREATE. Never throws — callers must not fail registration.
 */
export async function notifyManagersOfRegistrationSubmitted(
  adminClient: Supabase,
  input: {
    applicationId: string;
    applicantName: string;
    liveToast: boolean;
    createdBy?: string | null;
  }
): Promise<void> {
  const name = input.applicantName.trim() || "An applicant";
  const actionHref = getManagerRegistrationDetailRoute(input.applicationId);

  try {
    const { error } = await notificationRepository.createNotification(
      adminClient,
      {
        recipient_id: null,
        audience: "manager",
        category: "registration",
        priority: "normal",
        title: "New registration submitted",
        body: `${name} submitted a registration application.`,
        action_href: actionHref,
        created_by: input.createdBy ?? null,
        suppress_live_toast: !input.liveToast,
      }
    );

    if (error) {
      console.error(
        "[notifications] failed to notify managers of registration",
        {
          applicationId: input.applicationId,
          message: error.message,
        }
      );
    }
  } catch (error) {
    console.error(
      "[notifications] failed to notify managers of registration",
      {
        applicationId: input.applicationId,
        error,
      }
    );
  }
}

/**
 * System event: a teacher skipped or restored a class week.
 * Does not require NOTIFICATIONS_CREATE. Never throws — the skip already succeeded.
 */
export async function notifyManagersOfClassWeekSkipChange(
  adminClient: Supabase,
  input: {
    classId: string;
    className: string;
    skipDate: string;
    isSkipped: boolean;
    actorLabel: string;
    actorUserId: string | null;
    reason?: string | null;
  }
): Promise<void> {
  const reasonText = input.reason?.trim() ? ` Reason: ${input.reason.trim()}` : "";
  const body = input.isSkipped
    ? `${input.actorLabel} skipped the ${input.skipDate} session of ${input.className}.${reasonText}`
    : `${input.actorLabel} restored the ${input.skipDate} session of ${input.className}.`;

  try {
    const { error } = await notificationRepository.createNotification(
      adminClient,
      {
        recipient_id: null,
        audience: "manager",
        category: "academic",
        priority: "normal",
        title: input.isSkipped ? "Class week skipped" : "Class week restored",
        body,
        action_href: getManagerClassDetailRoute(input.classId),
        created_by: input.actorUserId,
        suppress_live_toast: true,
      }
    );

    if (error) {
      console.error("[notifications] failed to notify managers of class week skip", {
        classId: input.classId,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("[notifications] failed to notify managers of class week skip", {
      classId: input.classId,
      error,
    });
  }
}
