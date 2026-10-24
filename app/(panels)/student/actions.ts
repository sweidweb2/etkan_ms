"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { parseChangeOwnPasswordFormData } from "@/lib/validators/auth/change-own-password";
import { parseUpdateOwnStudentProfileFormData } from "@/lib/validators/student/update-own-profile";
import { changeOwnStudentPassword } from "@/services/students/student-password-self.service";
import { updateOwnStudentProfile } from "@/services/students/student-profile-self.service";
import type { FieldErrors } from "@/types/auth";
import type { UpdateStudentActionState } from "@/types/manager-student";

export type ChangeOwnPasswordActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
};

export async function updateOwnStudentProfileAction(
  _prevState: UpdateStudentActionState,
  formData: FormData
): Promise<UpdateStudentActionState> {
  const parsed = parseUpdateOwnStudentProfileFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const actor = await getSessionAuditActor();
  const result = await updateOwnStudentProfile(
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

  revalidatePath(ROUTES.STUDENT_ROOT);

  return {
    success: true,
    message: result.message,
    student: result.student,
  };
}

export async function changeOwnPasswordAction(
  _prevState: ChangeOwnPasswordActionState,
  formData: FormData
): Promise<ChangeOwnPasswordActionState> {
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
  const result = await changeOwnStudentPassword(
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
