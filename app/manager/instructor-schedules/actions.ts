"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseCopyInstructorScheduleSlotsFormData,
  parseCreateInstructorScheduleSlotFormData,
  parseInstructorScheduleSlotIdFormData,
  parseUpdateInstructorScheduleSlotFormData,
} from "@/lib/validators/manager/instructor-schedule-slot";
import {
  copyLastWeekInstructorScheduleForManager,
  createInstructorScheduleSlotForManager,
  deleteInstructorScheduleSlotForManager,
  previewCopyLastWeekInstructorScheduleForManager,
  updateInstructorScheduleSlotForManager,
} from "@/services/instructor-schedule-slot.service";
import type {
  CopyInstructorSchedulePreview,
  CopyInstructorScheduleSlotActionState,
  CreateInstructorScheduleSlotActionState,
  DeleteInstructorScheduleSlotActionState,
  UpdateInstructorScheduleSlotActionState,
} from "@/types/manager-instructor-schedule";

export async function createInstructorScheduleSlotAction(
  _prevState: CreateInstructorScheduleSlotActionState,
  formData: FormData
): Promise<CreateInstructorScheduleSlotActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateInstructorScheduleSlotFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createInstructorScheduleSlotForManager(
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

export async function updateInstructorScheduleSlotAction(
  _prevState: UpdateInstructorScheduleSlotActionState,
  formData: FormData
): Promise<UpdateInstructorScheduleSlotActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateInstructorScheduleSlotFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateInstructorScheduleSlotForManager(
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

export async function deleteInstructorScheduleSlotAction(
  _prevState: DeleteInstructorScheduleSlotActionState,
  formData: FormData
): Promise<DeleteInstructorScheduleSlotActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseInstructorScheduleSlotIdFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteInstructorScheduleSlotForManager(
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

export async function previewCopyLastWeekInstructorScheduleAction(
  recordId: string,
  weekStart: string
): Promise<
  | { success: true; preview: CopyInstructorSchedulePreview }
  | { success: false; error: string }
> {
  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();

  return previewCopyLastWeekInstructorScheduleForManager(
    adminClient,
    actor.userId,
    recordId,
    weekStart
  );
}

export async function copyInstructorScheduleSlotsAction(
  _prevState: CopyInstructorScheduleSlotActionState,
  formData: FormData
): Promise<CopyInstructorScheduleSlotActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCopyInstructorScheduleSlotsFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await copyLastWeekInstructorScheduleForManager(
    adminClient,
    actor.userId,
    actor,
    parsed.data.record_id,
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
