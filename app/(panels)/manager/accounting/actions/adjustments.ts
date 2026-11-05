"use server";

import { runManagerAction } from "@/lib/actions/run-manager-action";
import { getSessionAuditActor } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  parseCreateFinancialAdjustmentFormData,
  parseUpdateFinancialAdjustmentFormData,
} from "@/lib/validators/manager/create-financial-adjustment";
import {
  parseImportFinancialAdjustmentFormData,
} from "@/lib/validators/manager/import-financial-adjustment";
import {
  parseDeleteFinancialAdjustmentFormData,
} from "@/lib/validators/manager/delete-financial-adjustment";
import {
  createAdjustmentForManager,
  deleteAdjustmentForManager,
  importAdjustmentForManager,
  listImportableAdjustmentsForManager,
  updateAdjustmentForManager,
} from "@/services/accounting/student-financial-adjustment.service";
import type {
  CreateFinancialAdjustmentActionState,
  DeleteFinancialAdjustmentActionState,
  ImportFinancialAdjustmentActionState,
  ManagerImportableAdjustmentRow,
  UpdateFinancialAdjustmentActionState,
} from "@/types/manager-financial-adjustment";
import {
  revalidateAccountingList,
  revalidateAccountingSppDetail,
} from "./revalidate";

export async function createFinancialAdjustmentAction(
  _prevState: CreateFinancialAdjustmentActionState,
  formData: FormData
): Promise<CreateFinancialAdjustmentActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateFinancialAdjustmentFormData,
    mutate: ({ adminClient, actor, data }) =>
      createAdjustmentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      adjustment: result.adjustment,
      spp: result.spp,
    }),
  });
}

export async function importFinancialAdjustmentAction(
  _prevState: ImportFinancialAdjustmentActionState,
  formData: FormData
): Promise<ImportFinancialAdjustmentActionState> {
  return runManagerAction({
    formData,
    parse: parseImportFinancialAdjustmentFormData,
    mutate: ({ adminClient, actor, data }) =>
      importAdjustmentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
      revalidateAccountingList();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      adjustment: result.adjustment,
      spp: result.spp,
    }),
  });
}

export async function loadImportableAdjustmentsAction(
  studentId: string,
  excludeSppId: string
): Promise<ManagerImportableAdjustmentRow[]> {
  const actor = await getSessionAuditActor();
  if (!actor.userId) {
    return [];
  }

  const adminClient = createSupabaseAdminClient();
  return listImportableAdjustmentsForManager(
    adminClient,
    actor.userId,
    studentId,
    excludeSppId
  );
}

export async function updateFinancialAdjustmentAction(
  _prevState: UpdateFinancialAdjustmentActionState,
  formData: FormData
): Promise<UpdateFinancialAdjustmentActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateFinancialAdjustmentFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateAdjustmentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      adjustment: result.adjustment,
      spp: result.spp,
    }),
  });
}

export async function deleteFinancialAdjustmentAction(
  _prevState: DeleteFinancialAdjustmentActionState,
  formData: FormData
): Promise<DeleteFinancialAdjustmentActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteFinancialAdjustmentFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteAdjustmentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      student_payment_phase_id: result.student_payment_phase_id,
      payment_phase_id: result.payment_phase_id,
      spp: result.spp,
    }),
  });
}
