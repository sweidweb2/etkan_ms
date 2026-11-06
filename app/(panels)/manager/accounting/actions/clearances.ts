"use server";

import { runManagerAction } from "@/lib/actions/run-manager-action";
import {
  parseDeleteSppClearanceFormData,
} from "@/lib/validators/manager/delete-spp-clearance";
import {
  parseBulkCreateSppClearancesFormData,
} from "@/lib/validators/manager/bulk-create-spp-clearances";
import {
  parseBulkDeleteSppClearancesFormData,
} from "@/lib/validators/manager/bulk-delete-spp-clearances";
import {
  parseCreateSppClearanceFormData,
  parseUpdateSppClearanceFormData,
} from "@/lib/validators/manager/upsert-spp-clearance";
import {
  bulkCreateSppClearancesForManager,
  bulkDeleteSppClearancesForManager,
  createSppClearanceForManager,
  deleteSppClearanceForManager,
  updateSppClearanceForManager,
} from "@/services/accounting/spp-clearance.service";
import type {
  BulkCreateSppClearancesActionState,
  BulkDeleteSppClearancesActionState,
  DeleteSppClearanceActionState,
  UpsertSppClearanceActionState,
} from "@/types/manager-spp-clearance";
import {
  revalidateAccountingPhaseDetail,
  revalidateAccountingSppDetail,
} from "./revalidate";

export async function createSppClearanceAction(
  _prevState: UpsertSppClearanceActionState,
  formData: FormData
): Promise<UpsertSppClearanceActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateSppClearanceFormData,
    mutate: ({ adminClient, actor, data }) =>
      createSppClearanceForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      clearance: result.clearance,
      student_payment_phase_id: result.student_payment_phase_id,
      payment_phase_id: result.payment_phase_id,
    }),
  });
}

export async function updateSppClearanceAction(
  _prevState: UpsertSppClearanceActionState,
  formData: FormData
): Promise<UpsertSppClearanceActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateSppClearanceFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateSppClearanceForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      clearance: result.clearance,
      student_payment_phase_id: result.student_payment_phase_id,
      payment_phase_id: result.payment_phase_id,
    }),
  });
}

export async function deleteSppClearanceAction(
  _prevState: DeleteSppClearanceActionState,
  formData: FormData
): Promise<DeleteSppClearanceActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteSppClearanceFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteSppClearanceForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      if (result.payment_phase_id) {
        revalidateAccountingSppDetail(
          result.payment_phase_id,
          result.student_payment_phase_id
        );
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      student_payment_phase_id: result.student_payment_phase_id,
      payment_phase_id: result.payment_phase_id,
    }),
  });
}

export async function bulkCreateSppClearancesAction(
  _prevState: BulkCreateSppClearancesActionState,
  formData: FormData
): Promise<BulkCreateSppClearancesActionState> {
  return runManagerAction({
    formData,
    parse: parseBulkCreateSppClearancesFormData,
    mutate: ({ adminClient, actor, data }) =>
      bulkCreateSppClearancesForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingPhaseDetail(result.payment_phase_id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      created_count: result.created_count,
      payment_phase_id: result.payment_phase_id,
    }),
  });
}

export async function bulkDeleteSppClearancesAction(
  _prevState: BulkDeleteSppClearancesActionState,
  formData: FormData
): Promise<BulkDeleteSppClearancesActionState> {
  return runManagerAction({
    formData,
    parse: parseBulkDeleteSppClearancesFormData,
    mutate: ({ adminClient, actor, data }) =>
      bulkDeleteSppClearancesForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingPhaseDetail(result.payment_phase_id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      deleted_count: result.deleted_count,
      payment_phase_id: result.payment_phase_id,
    }),
  });
}
