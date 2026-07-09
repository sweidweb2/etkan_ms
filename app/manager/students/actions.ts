"use server";

import { getSessionRole } from "@/lib/auth/session";
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
  const actorRole = await getSessionRole();

  const parsed = parseCreateStudentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createStudent(adminClient, actorRole, parsed.data);

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
    student: result.student,
  };
}

export async function updateStudentAction(
  _prevState: UpdateStudentActionState,
  formData: FormData
): Promise<UpdateStudentActionState> {
  const actorRole = await getSessionRole();

  const parsed = parseUpdateStudentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateStudent(adminClient, actorRole, parsed.data);

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
    student: result.student,
  };
}
