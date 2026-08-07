"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseSubmitPublicFinancialFormFormData } from "@/lib/validators/manager/upsert-financial-form";
import { submitFinancialFormByToken } from "@/services/student-financial-adjustment.service";
import type { SubmitPublicFinancialFormActionState } from "@/types/manager-financial-adjustment";

export async function submitPublicFinancialFormAction(
  _prevState: SubmitPublicFinancialFormActionState,
  formData: FormData
): Promise<SubmitPublicFinancialFormActionState> {
  const token = String(formData.get("token") ?? "").trim();
  const parsed = parseSubmitPublicFinancialFormFormData(formData, token);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await submitFinancialFormByToken(adminClient, parsed.data);

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
