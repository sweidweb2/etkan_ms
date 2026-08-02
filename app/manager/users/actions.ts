"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  revalidateManagerPeopleLists,
  revalidateManagerUsersList,
} from "@/lib/cache/manager-list-cache";
import { ROUTES } from "@/lib/constants/routes";
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
  const actor = await getSessionAuditActor();

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

  revalidateManagerUsersList();
  revalidatePath(ROUTES.MANAGER_INSTRUCTORS);

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
  const actor = await getSessionAuditActor();

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

  revalidateManagerPeopleLists();
  revalidatePath(ROUTES.MANAGER_INSTRUCTORS);

  return {
    success: true,
    message: result.message,
    user: result.user,
  };
}
