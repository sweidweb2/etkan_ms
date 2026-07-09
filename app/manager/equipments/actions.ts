"use server";

import { getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateEquipmentFormData } from "@/lib/validators/manager/create-equipment";
import { parseUpdateEquipmentFormData } from "@/lib/validators/manager/update-equipment";
import {
  createEquipmentForManager,
  updateEquipmentForManager,
} from "@/services/equipment.service";
import type {
  CreateEquipmentActionState,
  UpdateEquipmentActionState,
} from "@/types/manager-equipment";

export async function createEquipmentAction(
  _prevState: CreateEquipmentActionState,
  formData: FormData
): Promise<CreateEquipmentActionState> {
  const actorRole = await getSessionRole();
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
  const actorRole = await getSessionRole();
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
