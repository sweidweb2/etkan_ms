"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  getManagerAccountingPhaseDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCancelPaymentPhaseFormData } from "@/lib/validators/manager/cancel-payment-phase";
import { parseCreatePaymentPhaseFormData } from "@/lib/validators/manager/create-payment-phase";
import { parseRepairMissingSppFormData } from "@/lib/validators/manager/repair-missing-spp";
import { parseUpdatePaymentPhaseFormData } from "@/lib/validators/manager/update-payment-phase";
import {
  cancelPaymentPhaseForManager,
  createPaymentPhaseForManager,
  repairMissingSppForManager,
  updatePaymentPhaseForManager,
} from "@/services/payment-phase.service";
import type {
  CancelPaymentPhaseActionState,
  CreatePaymentPhaseActionState,
  RepairMissingSppActionState,
  UpdatePaymentPhaseActionState,
} from "@/types/manager-payment-phase";

export async function createPaymentPhaseAction(
  _prevState: CreatePaymentPhaseActionState,
  formData: FormData
): Promise<CreatePaymentPhaseActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreatePaymentPhaseFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createPaymentPhaseForManager(
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

  revalidatePath(ROUTES.MANAGER_ACCOUNTING);

  return {
    success: true,
    message: result.message,
    phase: result.phase,
  };
}

export async function repairMissingSppAction(
  _prevState: RepairMissingSppActionState,
  formData: FormData
): Promise<RepairMissingSppActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseRepairMissingSppFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await repairMissingSppForManager(
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

  revalidatePath(ROUTES.MANAGER_ACCOUNTING);

  return {
    success: true,
    message: result.message,
  };
}

export async function updatePaymentPhaseAction(
  _prevState: UpdatePaymentPhaseActionState,
  formData: FormData
): Promise<UpdatePaymentPhaseActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdatePaymentPhaseFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updatePaymentPhaseForManager(
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

  revalidatePath(ROUTES.MANAGER_ACCOUNTING);
  revalidatePath(getManagerAccountingPhaseDetailRoute(result.phase.id));

  return {
    success: true,
    message: result.message,
    phase: result.phase,
  };
}

export async function cancelPaymentPhaseAction(
  _prevState: CancelPaymentPhaseActionState,
  formData: FormData
): Promise<CancelPaymentPhaseActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCancelPaymentPhaseFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await cancelPaymentPhaseForManager(
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

  revalidatePath(ROUTES.MANAGER_ACCOUNTING);
  revalidatePath(getManagerAccountingPhaseDetailRoute(result.phase.id));

  return {
    success: true,
    message: result.message,
    phase: result.phase,
  };
}
