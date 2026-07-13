"use server";

import { getSessionAuditActor, getSessionRole } from "@/lib/auth/session";
import {
  revalidateManagerPeopleLists,
  revalidateManagerUsersList,
} from "@/lib/cache/manager-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateStaffUserFormData } from "@/lib/validators/manager/create-user";
import { parseUpdateManagerUserFormData } from "@/lib/validators/manager/update-user";
import { createStaffUser, updateManagerUser } from "@/services/user.service";
import type {
  CreateStaffUserActionState,
  UpdateManagerUserActionState,
} from "@/types/manager-user";

export async function createStaffUserAction(
  _prevState: CreateStaffUserActionState,
  formData: FormData
): Promise<CreateStaffUserActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

  const parsed = parseCreateStaffUserFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createStaffUser(
    adminClient,
    actorRole,
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

  revalidateManagerUsersList();

  return {
    success: true,
    message: result.message,
    user: result.user,
  };
}

export async function updateUserAction(
  _prevState: UpdateManagerUserActionState,
  formData: FormData
): Promise<UpdateManagerUserActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

  const parsed = parseUpdateManagerUserFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateManagerUser(
    adminClient,
    actorRole,
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

  revalidateManagerPeopleLists();

  return {
    success: true,
    message: result.message,
    user: result.user,
  };
}
