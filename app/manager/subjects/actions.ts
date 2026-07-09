"use server";

import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateSubjectFormData } from "@/lib/validators/manager/create-subject";
import { createSubjectForManager } from "@/services/subject.service";
import type { CreateSubjectActionState } from "@/types/manager-subject";

export async function createSubjectAction(
  _prevState: CreateSubjectActionState,
  formData: FormData
): Promise<CreateSubjectActionState> {
  const actorRole = await getSessionRole();

  const parsed = parseCreateSubjectFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createSubjectForManager(
    adminClient,
    actorRole,
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
    subject: result.subject,
  };
}
