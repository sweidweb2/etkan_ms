"use server";

import { getSessionAuditActor, getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreateRelationshipFormData } from "@/lib/validators/manager/create-relationship";
import { parseUpdateRelationshipFormData } from "@/lib/validators/manager/update-relationship";
import {
  createRelationshipForManager,
  updateRelationshipForManager,
} from "@/services/relationship.service";
import type {
  CreateRelationshipActionState,
  UpdateRelationshipActionState,
} from "@/types/manager-relationship";

export async function createRelationshipAction(
  _prevState: CreateRelationshipActionState,
  formData: FormData
): Promise<CreateRelationshipActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

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
    relationship: result.relationship,
  };
}

export async function updateRelationshipAction(
  _prevState: UpdateRelationshipActionState,
  formData: FormData
): Promise<UpdateRelationshipActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);

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
    relationship: result.relationship,
  };
}
