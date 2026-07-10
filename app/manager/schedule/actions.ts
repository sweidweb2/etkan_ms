"use server";

import { getSessionAuditActor, getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseCreateWeeklyScheduleSlotFormData,
  parseUpdateWeeklyScheduleSlotFormData,
  parseWeeklyScheduleSlotIdFormData,
} from "@/lib/validators/manager/weekly-schedule-slot";
import {
  createWeeklyScheduleSlotForManager,
  deleteWeeklyScheduleSlotForManager,
  updateWeeklyScheduleSlotForManager,
} from "@/services/weekly-schedule-slot.service";
import type {
  CreateWeeklyScheduleSlotActionState,
  DeleteWeeklyScheduleSlotActionState,
  UpdateWeeklyScheduleSlotActionState,
} from "@/types/manager-weekly-schedule";

export async function createWeeklyScheduleSlotAction(
  _prevState: CreateWeeklyScheduleSlotActionState,
  formData: FormData
): Promise<CreateWeeklyScheduleSlotActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseCreateWeeklyScheduleSlotFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createWeeklyScheduleSlotForManager(
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

  return {
    success: true,
    message: result.message,
    session: result.session,
  };
}

export async function updateWeeklyScheduleSlotAction(
  _prevState: UpdateWeeklyScheduleSlotActionState,
  formData: FormData
): Promise<UpdateWeeklyScheduleSlotActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseUpdateWeeklyScheduleSlotFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateWeeklyScheduleSlotForManager(
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

  return {
    success: true,
    message: result.message,
    session: result.session,
  };
}

export async function deleteWeeklyScheduleSlotAction(
  _prevState: DeleteWeeklyScheduleSlotActionState,
  formData: FormData
): Promise<DeleteWeeklyScheduleSlotActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseWeeklyScheduleSlotIdFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteWeeklyScheduleSlotForManager(
    adminClient,
    actorRole,
    actor,
    parsed.data.id
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  return {
    success: true,
    message: result.message,
  };
}
