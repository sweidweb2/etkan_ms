"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateNotificationFormData } from "@/lib/validators/manager/create-notification";
import { parseMarkNotificationReadFormData } from "@/lib/validators/manager/mark-notifications-read";
import { parseNotificationIdFormData } from "@/lib/validators/manager/notification-id";
import { parseUpdateNotificationFormData } from "@/lib/validators/manager/update-notification";
import {
  createNotificationForManager,
  deleteNotificationForManager,
  markNotificationReadForManager,
  updateNotificationForManager,
} from "@/services/notification.service";
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
  const actor = await getSessionAuditActor();
  const parsed = parseCreateNotificationFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createNotificationForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    notification: result.notification,
  };
}

export async function updateNotificationAction(
  _prevState: UpdateNotificationActionState,
  formData: FormData
): Promise<UpdateNotificationActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateNotificationFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateNotificationForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }

  return {
    success: true,
    message: result.message,
    notification: result.notification,
  };
}

export async function markNotificationReadAction(
  _prevState: MarkNotificationReadActionState,
  formData: FormData
): Promise<MarkNotificationReadActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseMarkNotificationReadFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await markNotificationReadForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    message: result.message,
  };
}

export async function deleteNotificationAction(
  _prevState: DeleteNotificationActionState,
  formData: FormData
): Promise<DeleteNotificationActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseNotificationIdFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteNotificationForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data.id
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    message: result.message,
  };
}
