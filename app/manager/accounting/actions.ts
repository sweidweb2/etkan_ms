"use server";

import { getSessionAuditActor, getSessionRole } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCreatePaymentFormData } from "@/lib/validators/manager/add-payment";
import {
  parseCreateScheduledPaymentFormData,
  parseUpdateScheduledPaymentFormData,
} from "@/lib/validators/manager/scheduled-payment";
import { parseUpdatePaymentFormData } from "@/lib/validators/manager/update-payment";
import { parseUpdateSubscribedSemesterFormData } from "@/lib/validators/manager/update-subscribed-semester";
import {
  createPaymentForManager,
  createScheduledPaymentForManager,
  updatePaymentForManager,
  updateScheduledPaymentForManager,
  updateSubscribedSemesterForManager,
} from "@/services/accounting.service";
import type { AccountingMutationActionState } from "@/types/manager-accounting";

export async function createPaymentAction(
  _prevState: AccountingMutationActionState,
  formData: FormData
): Promise<AccountingMutationActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseCreatePaymentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createPaymentForManager(
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

export async function updatePaymentAction(
  _prevState: AccountingMutationActionState,
  formData: FormData
): Promise<AccountingMutationActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseUpdatePaymentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updatePaymentForManager(
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

export async function updateSubscribedSemesterAction(
  _prevState: AccountingMutationActionState,
  formData: FormData
): Promise<AccountingMutationActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseUpdateSubscribedSemesterFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateSubscribedSemesterForManager(
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

export async function createScheduledPaymentAction(
  _prevState: AccountingMutationActionState,
  formData: FormData
): Promise<AccountingMutationActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseCreateScheduledPaymentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createScheduledPaymentForManager(
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

export async function updateScheduledPaymentAction(
  _prevState: AccountingMutationActionState,
  formData: FormData
): Promise<AccountingMutationActionState> {
  const [actorRole, actor] = await Promise.all([
    getSessionRole(),
    getSessionAuditActor(),
  ]);
  const parsed = parseUpdateScheduledPaymentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateScheduledPaymentForManager(
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
