"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreatePhaseFormData } from "@/lib/validators/manager/create-phase";
import { parseUpdatePhaseFormData } from "@/lib/validators/manager/update-phase";
import {
  createSemesterForManager,
  updateSemesterForManager,
} from "@/services/classes/semester.service";
import type {
  CreateSemesterActionState,
  UpdateSemesterActionState,
} from "@/types/manager-phase";

export async function createSemesterAction(
  _prevState: CreateSemesterActionState,
  formData: FormData
): Promise<CreateSemesterActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseCreatePhaseFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createSemesterForManager(
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

  return {
    success: true,
    message: result.message,
    semester: result.semester,
  };
}

export async function updateSemesterAction(
  _prevState: UpdateSemesterActionState,
  formData: FormData
): Promise<UpdateSemesterActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdatePhaseFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateSemesterForManager(
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

  return {
    success: true,
    message: result.message,
    semester: result.semester,
  };
}
