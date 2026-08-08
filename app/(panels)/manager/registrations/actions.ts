"use server";

import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseUpdateManagerRegistrationFormData,
  parseUpdateRegistrationStatusFormData,
} from "@/lib/validators/public/registration";
import {
  getRegistrationDocumentSignedUrlsForManager,
  updateRegistrationApplicationForManager,
  updateRegistrationApplicationStatusForManager,
} from "@/services/student-registration.service";
import type {
  GetRegistrationDocumentSignedUrlsActionState,
  UpdateRegistrationStatusActionState,
} from "@/types/public-registration";

export async function updateRegistrationStatusAction(
  _prevState: UpdateRegistrationStatusActionState,
  formData: FormData
): Promise<UpdateRegistrationStatusActionState> {
  const parsed = parseUpdateRegistrationStatusFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();
  const result = await updateRegistrationApplicationStatusForManager(
    adminClient,
    actor.userId,
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

export async function updateRegistrationApplicationAction(
  _prevState: UpdateRegistrationStatusActionState,
  formData: FormData
): Promise<UpdateRegistrationStatusActionState> {
  const parsed = parseUpdateManagerRegistrationFormData(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();
  const result = await updateRegistrationApplicationForManager(
    adminClient,
    actor.userId,
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

export async function getRegistrationDocumentSignedUrlsAction(
  applicationId: string
): Promise<GetRegistrationDocumentSignedUrlsActionState> {
  if (!applicationId.trim()) {
    return { success: false, error: "Application id is required." };
  }

  const actor = await getSessionAuditActor();
  const adminClient = createSupabaseAdminClient();
  const result = await getRegistrationDocumentSignedUrlsForManager(
    adminClient,
    actor.userId,
    applicationId
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, documents: result.documents };
}
