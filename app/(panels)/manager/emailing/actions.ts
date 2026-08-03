"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseSendEmailFormData } from "@/lib/validators/manager/send-email";
import { sendEmailsForManager } from "@/services/email.service";
import type { SendManagerEmailActionState } from "@/types/manager-emailing";

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
