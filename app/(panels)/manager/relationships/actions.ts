"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { revalidateManagerRelationshipsList } from "@/lib/cache/manager-list-cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateRelationshipFormData } from "@/lib/validators/manager/create-relationship";
import { parseUpdateRelationshipFormData } from "@/lib/validators/manager/update-relationship";
import {
  createRelationshipForManager,
  updateRelationshipForManager,
} from "@/services/relationships/relationship.service";
import type {
  CreateRelationshipActionState,
  UpdateRelationshipActionState,
} from "@/types/manager-relationship";

export async function createRelationshipAction(
  _prevState: CreateRelationshipActionState,
  formData: FormData
): Promise<CreateRelationshipActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseCreateRelationshipFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createRelationshipForManager(
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

  revalidateManagerRelationshipsList();

  return {
    success: true,
    message: result.message,
    relationship: result.relationship,
  };
}

export async function updateRelationshipAction(
  _prevState: UpdateRelationshipActionState,
  formData: FormData
): Promise<UpdateRelationshipActionState> {
  const actor = await getSessionAuditActor();

  const parsed = parseUpdateRelationshipFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateRelationshipForManager(
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

  revalidateManagerRelationshipsList();

  return {
    success: true,
    message: result.message,
    relationship: result.relationship,
  };
}
