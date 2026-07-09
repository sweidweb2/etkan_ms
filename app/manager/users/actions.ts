"use server";

import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateStaffUserFormData } from "@/lib/validators/manager/create-user";
import { createStaffUser } from "@/services/user.service";
import type { CreateStaffUserActionState } from "@/types/manager-user";

export async function createStaffUserAction(
  _prevState: CreateStaffUserActionState,
  formData: FormData
): Promise<CreateStaffUserActionState> {
  const actorRole = await getSessionRole();

  const parsed = parseCreateStaffUserFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createStaffUser(adminClient, actorRole, parsed.data);

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
    user: result.user,
  };
}
