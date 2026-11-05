"use server";

import { runManagerAction } from "@/lib/actions/run-manager-action";
import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseCancelPaymentPhaseFormData,
} from "@/lib/validators/manager/cancel-payment-phase";
import {
  parseCreatePaymentPhaseFormData,
} from "@/lib/validators/manager/create-payment-phase";
import {
  parseUpdatePaymentPhaseFormData,
} from "@/lib/validators/manager/update-payment-phase";
import {
  cancelPaymentPhaseForManager,
  createPaymentPhaseForManager,
  listPaymentPhaseSemesterOptionsForManager,
  updatePaymentPhaseForManager,
} from "@/services/accounting/payment-phase.service";
import type {
  CancelPaymentPhaseActionState,
  CreatePaymentPhaseActionState,
  ManagerPaymentPhaseSemesterOption,
  UpdatePaymentPhaseActionState,
} from "@/types/manager-payment-phase";
import {
  revalidateAccountingList,
  revalidateAccountingPhaseListAndDetail,
} from "./revalidate";

export async function loadPaymentPhaseSemesterOptionsAction(): Promise<
  ManagerPaymentPhaseSemesterOption[]
> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  return listPaymentPhaseSemesterOptionsForManager(adminClient, actor.userId);
}

export async function createPaymentPhaseAction(
  _prevState: CreatePaymentPhaseActionState,
  formData: FormData
): Promise<CreatePaymentPhaseActionState> {
  return runManagerAction({
    formData,
    parse: parseCreatePaymentPhaseFormData,
    mutate: ({ adminClient, actor, data }) =>
      createPaymentPhaseForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidateAccountingList();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      phase: result.phase,
    }),
  });
}

export async function updatePaymentPhaseAction(
  _prevState: UpdatePaymentPhaseActionState,
  formData: FormData
): Promise<UpdatePaymentPhaseActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdatePaymentPhaseFormData,
    mutate: ({ adminClient, actor, data }) =>
      updatePaymentPhaseForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingPhaseListAndDetail(result.phase.id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      phase: result.phase,
    }),
  });
}

export async function cancelPaymentPhaseAction(
  _prevState: CancelPaymentPhaseActionState,
  formData: FormData
): Promise<CancelPaymentPhaseActionState> {
  return runManagerAction({
    formData,
    parse: parseCancelPaymentPhaseFormData,
    mutate: ({ adminClient, actor, data }) =>
      cancelPaymentPhaseForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingPhaseListAndDetail(result.phase.id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      phase: result.phase,
    }),
  });
}
