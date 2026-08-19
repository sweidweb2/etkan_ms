"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseRemoveTempRegistrationDocumentFormData,
  parseSubmitPublicRegistrationFormData,
  parseTempUploadRegistrationDocumentFormData,
} from "@/lib/validators/public/registration";
import {
  removeTempRegistrationDocument,
  submitPublicRegistrationApplication,
  tempUploadRegistrationDocument,
} from "@/services/students/student-registration.service";
import type {
  RemoveTempRegistrationDocumentActionState,
  SubmitPublicRegistrationActionState,
  TempUploadRegistrationDocumentActionState,
} from "@/types/public-registration";

export async function submitPublicRegistrationAction(
  _prevState: SubmitPublicRegistrationActionState,
  formData: FormData
): Promise<SubmitPublicRegistrationActionState> {
  const parsed = parseSubmitPublicRegistrationFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await submitPublicRegistrationApplication(
    adminClient,
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

export async function tempUploadRegistrationDocumentAction(
  formData: FormData
): Promise<TempUploadRegistrationDocumentActionState> {
  const parsed = parseTempUploadRegistrationDocumentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await tempUploadRegistrationDocument(
    adminClient,
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
    document: result.document,
  };
}

export async function removeTempRegistrationDocumentAction(
  formData: FormData
): Promise<RemoveTempRegistrationDocumentActionState> {
  const parsed = parseRemoveTempRegistrationDocumentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await removeTempRegistrationDocument(
    adminClient,
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
