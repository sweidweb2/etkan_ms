"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseCreateInstructorScheduleSlotFormData,
  parseInstructorScheduleSlotIdFormData,
  parseUpdateInstructorScheduleSlotFormData,
} from "@/lib/validators/manager/instructor-schedule-slot";
import {
  createInstructorScheduleSlotForManager,
  deleteInstructorScheduleSlotForManager,
  listInstructorScheduleSlotsPageForManager,
  updateInstructorScheduleSlotForManager,
} from "@/services/instructor-schedule-slot.service";
import type {
  CreateInstructorScheduleSlotActionState,
  DeleteInstructorScheduleSlotActionState,
  ManagerInstructorScheduleSession,
  UpdateInstructorScheduleSlotActionState,
} from "@/types/manager-instructor-schedule";

export async function loadInstructorScheduleSlotsPageAction(input: {
  page: number;
  pageSize: number;
  entityType?: string;
  type?: string;
  search?: string;
}): Promise<{
  sessions: ManagerInstructorScheduleSession[];
  totalCount: number;
  page: number;
  pageSize: number;
}> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return {
      sessions: [],
      totalCount: 0,
      page: input.page,
      pageSize: input.pageSize,
    };
  }

  const adminClient = createSupabaseAdminClient();
  try {
    return await listInstructorScheduleSlotsPageForManager(
      adminClient,
      actor.userId,
      input
    );
  } catch {
    return {
      sessions: [],
      totalCount: 0,
      page: input.page,
      pageSize: input.pageSize,
    };
  }
}

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
