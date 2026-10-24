"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { parseChangeOwnPasswordFormData } from "@/lib/validators/auth/change-own-password";
import { parseUpdateOwnTeacherProfileFormData } from "@/lib/validators/teacher/update-own-profile";
import {
  changeOwnTeacherPassword,
  updateOwnTeacherProfile,
  type TeacherSelfProfile,
} from "@/services/auth/teacher-account-self.service";
import type { FieldErrors } from "@/types/auth";

export type UpdateOwnTeacherProfileActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  profile?: TeacherSelfProfile;
};

export type ChangeOwnTeacherPasswordActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export async function updateOwnTeacherProfileAction(
  _prevState: UpdateOwnTeacherProfileActionState,
  formData: FormData
): Promise<UpdateOwnTeacherProfileActionState> {
  const parsed = parseUpdateOwnTeacherProfileFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const actor = await getSessionAuditActor();
  const result = await updateOwnTeacherProfile(
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

  revalidatePath(ROUTES.TEACHER_SETTINGS);

  return {
    success: true,
    message: result.message,
    profile: result.profile,
  };
}

export async function changeOwnTeacherPasswordAction(
  _prevState: ChangeOwnTeacherPasswordActionState,
  formData: FormData
): Promise<ChangeOwnTeacherPasswordActionState> {
  const parsed = parseChangeOwnPasswordFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const sessionClient = await createSupabaseServerActionClient();
  const actor = await getSessionAuditActor();
  const result = await changeOwnTeacherPassword(
    adminClient,
    sessionClient,
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

  return {
    success: true,
    message: result.message,
  };
}
