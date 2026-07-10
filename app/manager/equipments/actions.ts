"use server";

import { getSessionAuditActor, getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateEquipmentFormData } from "@/lib/validators/manager/create-equipment";
import { parseCreateBorrowsFormData } from "@/lib/validators/manager/create-borrows";
import {
  parseToggleBorrowReturnedFormData,
  parseUpdateBorrowRecordFormData,
} from "@/lib/validators/manager/update-borrow-equipment";
import { parseUpdateEquipmentFormData } from "@/lib/validators/manager/update-equipment";
import {
  createBorrowsForManager,
  toggleBorrowReturnedForManager,
  updateBorrowRecordForManager,
} from "@/services/borrow-equipment.service";
import {
  createEquipmentForManager,
  updateEquipmentForManager,
} from "@/services/equipment.service";
import type {
  CreateEquipmentActionState,
  UpdateEquipmentActionState,
} from "@/types/manager-equipment";
import type {
  CreateBorrowsActionState,
  ToggleBorrowReturnedActionState,
  UpdateBorrowRecordActionState,
} from "@/types/manager-borrow-equipment-list";

export async function createEquipmentAction(
  _prevState: CreateEquipmentActionState,
  formData: FormData
): Promise<CreateEquipmentActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseCreateEquipmentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createEquipmentForManager(
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
    equipment: result.equipment,
  };
}

export async function updateEquipmentAction(
  _prevState: UpdateEquipmentActionState,
  formData: FormData
): Promise<UpdateEquipmentActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseUpdateEquipmentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateEquipmentForManager(
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
    equipment: result.equipment,
  };
}

export async function createBorrowsAction(
  _prevState: CreateBorrowsActionState,
  formData: FormData
): Promise<CreateBorrowsActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseCreateBorrowsFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createBorrowsForManager(
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
    createdCount: result.createdCount,
  };
}

export async function updateBorrowRecordAction(
  _prevState: UpdateBorrowRecordActionState,
  formData: FormData
): Promise<UpdateBorrowRecordActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseUpdateBorrowRecordFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateBorrowRecordForManager(
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
  };
}

export async function toggleBorrowReturnedAction(
  _prevState: ToggleBorrowReturnedActionState,
  formData: FormData
): Promise<ToggleBorrowReturnedActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseToggleBorrowReturnedFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await toggleBorrowReturnedForManager(
    adminClient,
    actorRole,
    actor,
    parsed.data
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
