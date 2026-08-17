"use server";

import { parseSubmitGuestRegistrationByTokenFormData } from "@/lib/validators/public/registration";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { submitGuestRegistrationByToken } from "@/services/guest-registration.service";
import type { SubmitPublicRegistrationActionState } from "@/types/public-registration";

export async function submitGuestRegistrationByTokenAction(
  _prevState: SubmitPublicRegistrationActionState,
  formData: FormData
): Promise<SubmitPublicRegistrationActionState> {
  const parsed = parseSubmitGuestRegistrationByTokenFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const { token, ...input } = parsed.data;
  const adminClient = createSupabaseAdminClient();
  const result = await submitGuestRegistrationByToken(
    adminClient,
    token,
    input
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
  };
}
