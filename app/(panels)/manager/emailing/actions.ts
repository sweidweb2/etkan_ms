"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseSendEmailFormData } from "@/lib/validators/manager/send-email";
import { sendEmailsForManager, listEmailingClassMemberUserIdsForManager } from "@/services/communications/email.service";
import { listUsersForManager } from "@/services/auth/user.service";
import type { SendManagerEmailActionState } from "@/types/manager-emailing";
import type { ManagerUserRow } from "@/types/manager-user";

export async function sendManagerEmailAction(
  _prevState: SendManagerEmailActionState,
  formData: FormData
): Promise<SendManagerEmailActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseSendEmailFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await sendEmailsForManager(
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
      sentCount: result.sentCount,
      skippedCount: result.skippedCount,
      failedCount: result.failedCount,
    };
  }

  return {
    success: true,
    message: result.message,
    sentCount: result.sentCount,
    skippedCount: result.skippedCount,
    failedCount: result.failedCount,
  };
}

/**
 * Recipient picker data for the compose route. Loaded on first interaction
 * instead of on every compose visit (tag-cached list; authz checked per call).
 */
export async function loadEmailingRecipientsAction(): Promise<ManagerUserRow[]> {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();
  return listUsersForManager(adminClient, actor.userId);
}

export async function listEmailingClassMemberUserIdsAction(
  classId: string
): Promise<string[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listEmailingClassMemberUserIdsForManager(
      adminClient,
      actor.userId,
      classId
    );
  } catch {
    return [];
  }
}
