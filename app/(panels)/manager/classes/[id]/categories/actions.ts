"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  getManagerClassCategoriesRoute,
  getManagerClassDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseSaveClassFollowUpFormData } from "@/lib/validators/manager/save-class-follow-up";
import { saveClassFollowUpForManager } from "@/services/classes/class-follow-up.service";
import type { SaveClassFollowUpActionState } from "@/types/manager-class-follow-up";

export async function saveClassFollowUpAction(
  _prevState: SaveClassFollowUpActionState,
  formData: FormData
): Promise<SaveClassFollowUpActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseSaveClassFollowUpFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await saveClassFollowUpForManager(
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

  revalidatePath(ROUTES.MANAGER_CLASSES);
  revalidatePath(getManagerClassDetailRoute(parsed.data.class_id));
  revalidatePath(getManagerClassCategoriesRoute(parsed.data.class_id));

  return { success: true, message: result.message };
}
