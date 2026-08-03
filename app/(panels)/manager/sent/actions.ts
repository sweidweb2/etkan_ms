"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseResendEmailFormData } from "@/lib/validators/manager/resend-email";
import { resendSentEmailForManager } from "@/services/email.service";
import type { SendManagerEmailActionState } from "@/types/manager-emailing";

export async function resendManagerEmailAction(
  _prevState: SendManagerEmailActionState,
  formData: FormData
): Promise<SendManagerEmailActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseResendEmailFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await resendSentEmailForManager(adminClient, actor.userId, {
    emailSentId: parsed.data.emailSentId,
    userIds: parsed.data.userIds,
    toEmails: parsed.data.toEmails,
  });

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
