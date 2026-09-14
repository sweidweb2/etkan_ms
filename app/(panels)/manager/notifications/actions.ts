"use server";

import { runManagerAction } from "@/lib/actions/run-manager-action";
import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateNotificationFormData } from "@/lib/validators/manager/create-notification";
import { parseMarkNotificationReadFormData } from "@/lib/validators/manager/mark-notifications-read";
import { parseNotificationIdFormData } from "@/lib/validators/manager/notification-id";
import { parseUpdateNotificationFormData } from "@/lib/validators/manager/update-notification";
import {
  createNotificationForManager,
  deleteNotificationForManager,
  listNotificationsPageForManager,
  markNotificationReadForManager,
  updateNotificationForManager,
} from "@/services/communications/notification.service";
import type {
  CreateNotificationActionState,
  DeleteNotificationActionState,
  MarkNotificationReadActionState,
  UpdateNotificationActionState,
} from "@/types/manager-notification";

export async function createNotificationAction(
  _prevState: CreateNotificationActionState,
  formData: FormData
): Promise<CreateNotificationActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateNotificationFormData,
    mutate: ({ adminClient, actor, data }) =>
      createNotificationForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      notification: result.notification,
    }),
  });
}

export async function updateNotificationAction(
  _prevState: UpdateNotificationActionState,
  formData: FormData
): Promise<UpdateNotificationActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateNotificationFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateNotificationForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      notification: result.notification,
    }),
  });
}

export async function markNotificationReadAction(
  _prevState: MarkNotificationReadActionState,
  formData: FormData
): Promise<MarkNotificationReadActionState> {
  return runManagerAction({
    formData,
    parse: parseMarkNotificationReadFormData,
    mutate: ({ adminClient, actor, data }) =>
      markNotificationReadForManager(adminClient, actor.userId, actor, data),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function deleteNotificationAction(
  _prevState: DeleteNotificationActionState,
  formData: FormData
): Promise<DeleteNotificationActionState> {
  return runManagerAction({
    formData,
    parse: parseNotificationIdFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteNotificationForManager(adminClient, actor.userId, actor, data.id),
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function loadNotificationsPageAction(input: {
  page: number;
  pageSize: number;
  readFilter?: string;
  category?: string;
  search?: string;
}) {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return {
      notifications: [],
      total: 0,
      page: 1,
      pageSize: input.pageSize,
      stats: { total: 0, unread: 0, highPriority: 0 },
    };
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listNotificationsPageForManager(adminClient, actor.userId, input);
  } catch {
    return {
      notifications: [],
      total: 0,
      page: input.page,
      pageSize: input.pageSize,
      stats: { total: 0, unread: 0, highPriority: 0 },
    };
  }
}
