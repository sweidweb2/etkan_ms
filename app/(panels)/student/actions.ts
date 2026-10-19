"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import { ROUTES } from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseUpdateOwnStudentProfileFormData } from "@/lib/validators/student/update-own-profile";
import { updateOwnStudentProfile } from "@/services/students/student-profile-self.service";
import type { UpdateStudentActionState } from "@/types/manager-student";

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
