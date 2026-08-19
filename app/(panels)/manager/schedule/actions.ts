"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseCopyWeeklyScheduleSlotsFormData,
  parseCreateWeeklyScheduleSlotFormData,
  parseUpdateWeeklyScheduleSlotFormData,
  parseWeeklyScheduleSlotIdFormData,
} from "@/lib/validators/manager/weekly-schedule-slot";
import {
  copyLastWeekScheduleForManager,
  createWeeklyScheduleSlotForManager,
  deleteWeeklyScheduleSlotForManager,
  listWeeklyScheduleSlotsForManager,
  previewCopyLastWeekScheduleForManager,
  updateWeeklyScheduleSlotForManager,
} from "@/services/schedule/weekly-schedule-slot.service";
import type {
  CopyWeeklySchedulePreview,
  CopyWeeklyScheduleSlotActionState,
  CreateWeeklyScheduleSlotActionState,
  DeleteWeeklyScheduleSlotActionState,
  ManagerWeeklyScheduleSession,
  UpdateWeeklyScheduleSlotActionState,
} from "@/types/manager-weekly-schedule";

export async function createWeeklyScheduleSlotAction(
  _prevState: CreateWeeklyScheduleSlotActionState,
  formData: FormData
): Promise<CreateWeeklyScheduleSlotActionState> {
  const actor = await getSessionAuditActor();
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
    session: result.session,
  };
}

export async function updateWeeklyScheduleSlotAction(
  _prevState: UpdateWeeklyScheduleSlotActionState,
  formData: FormData
): Promise<UpdateWeeklyScheduleSlotActionState> {
  const actor = await getSessionAuditActor();
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
    session: result.session,
  };
}

export async function deleteWeeklyScheduleSlotAction(
  _prevState: DeleteWeeklyScheduleSlotActionState,
  formData: FormData
): Promise<DeleteWeeklyScheduleSlotActionState> {
  const actor = await getSessionAuditActor();
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
    actor.userId,
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

export async function previewCopyLastWeekScheduleAction(
  weekStart: string
): Promise<
  | { success: true; preview: CopyWeeklySchedulePreview }
  | { success: false; error: string }
> {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();

  return previewCopyLastWeekScheduleForManager(
    adminClient,
    actor.userId,
    weekStart
  );
}

export async function copyWeeklyScheduleSlotsAction(
  _prevState: CopyWeeklyScheduleSlotActionState,
  formData: FormData
): Promise<CopyWeeklyScheduleSlotActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCopyWeeklyScheduleSlotsFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await copyLastWeekScheduleForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data.week_start
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
    createdCount: result.createdCount,
    skippedCount: result.skippedCount,
  };
}

export async function loadWeeklyScheduleSlotsAction(
  weekStart: string
): Promise<ManagerWeeklyScheduleSession[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listWeeklyScheduleSlotsForManager(
      adminClient,
      actor.userId,
      { weekStart }
    );
  } catch {
    return [];
  }
}
