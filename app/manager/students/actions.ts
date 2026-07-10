"use server";

import { getSessionAuditActor, getSessionRole } from "@/lib/auth/session";
import { revalidateManagerPeopleLists } from "@/lib/cache/manager-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateStudentFormData } from "@/lib/validators/manager/create-student";
import { parseUpdateStudentFormData } from "@/lib/validators/manager/update-student";
import { createStudent, updateStudent } from "@/services/student.service";
import type {
  CreateStudentActionState,
  UpdateStudentActionState,
} from "@/types/manager-student";

export async function createStudentAction(
  _prevState: CreateStudentActionState,
  formData: FormData
): Promise<CreateStudentActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

  const parsed = parseCreateStudentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createStudent(
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
    student: result.student,
  };
}

export async function updateStudentAction(
  _prevState: UpdateStudentActionState,
  formData: FormData
): Promise<UpdateStudentActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

  const parsed = parseUpdateStudentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateStudent(
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
    student: result.student,
  };
}
