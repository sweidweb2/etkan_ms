"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { revalidateManagerPeopleLists } from "@/lib/cache/manager-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseChangeStudentStatusFormData } from "@/lib/validators/manager/change-student-status";
import { parseCreateStudentFormData } from "@/lib/validators/manager/create-student";
import { parseUpdateStudentFormData } from "@/lib/validators/manager/update-student";
import { createStudent, updateStudent } from "@/services/student.service";
import {
  changeStudentStatusForManager,
  getStudentStatusSideEffectsPreview,
} from "@/services/student-status.service";
import type {
  ChangeStudentStatusActionState,
  CreateStudentActionState,
  StudentStatusSideEffectsPreview,
  UpdateStudentActionState,
} from "@/types/manager-student";

export async function createStudentAction(
  _prevState: CreateStudentActionState,
  formData: FormData
): Promise<CreateStudentActionState> {
  const actor = await getSessionAuditActor();

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
  const actor = await getSessionAuditActor();

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

  return {
    success: true,
    message: result.message,
    student: result.student,
  };
}

export async function changeStudentStatusAction(
  _prevState: ChangeStudentStatusActionState,
  formData: FormData
): Promise<ChangeStudentStatusActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseChangeStudentStatusFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await changeStudentStatusForManager(
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

  return {
    success: true,
    message: result.message,
    warning: result.warning,
    status: result.status,
  };
}

export async function loadStudentStatusSideEffectsPreviewAction(
  userId: string
): Promise<
  | { success: true; preview: StudentStatusSideEffectsPreview }
  | { success: false; error: string }
> {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();

  try {
    const preview = await getStudentStatusSideEffectsPreview(
      adminClient,
      actor.userId,
      userId
    );
    return { success: true, preview };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to load student status details.",
    };
  }
}
