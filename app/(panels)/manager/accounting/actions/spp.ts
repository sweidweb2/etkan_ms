"use server";

import { redirect } from "next/navigation";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import { getManagerAccountingPhaseDetailRoute } from "@/lib/constants/routes";
import { appendQueryParam } from "@/lib/url/append-query-param";
import {
  parseDeleteStudentPaymentPhaseFormData,
} from "@/lib/validators/manager/delete-student-payment-phase";
import {
  parseRepairMissingSppFormData,
} from "@/lib/validators/manager/repair-missing-spp";
import {
  parseAssignOptionalEnrollPaymentPhasesFormData,
} from "@/lib/validators/manager/assign-optional-enroll-payment-phases";
import {
  parseTransferSppFormData,
} from "@/lib/validators/manager/transfer-spp";
import {
  assignOptionalEnrollPaymentPhasesForManager,
  repairMissingSppForManager,
  transferStudentPaymentPhaseForManager,
} from "@/services/accounting/payment-phase.service";
import {
  deleteSppForManager,
} from "@/services/accounting/student-payment.service";
import type {
  AssignOptionalEnrollPaymentPhasesActionState,
  RepairMissingSppActionState,
  TransferSppActionState,
} from "@/types/manager-payment-phase";
import type {
  DeleteStudentPaymentPhaseActionState,
} from "@/types/manager-student-payment";
import {
  revalidateAccountingList,
  revalidateAccountingPhaseDetail,
  revalidateAccountingPhaseListAndDetail,
} from "./revalidate";

export async function repairMissingSppAction(
  _prevState: RepairMissingSppActionState,
  formData: FormData
): Promise<RepairMissingSppActionState> {
  return runManagerAction({
    formData,
    parse: parseRepairMissingSppFormData,
    mutate: ({ adminClient, actor, data }) =>
      repairMissingSppForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidateAccountingList();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
    }),
  });
}

export async function assignOptionalEnrollPaymentPhasesAction(
  _prevState: AssignOptionalEnrollPaymentPhasesActionState,
  formData: FormData
): Promise<AssignOptionalEnrollPaymentPhasesActionState> {
  return runManagerAction({
    formData,
    parse: parseAssignOptionalEnrollPaymentPhasesFormData,
    mutate: ({ adminClient, actor, data }) =>
      assignOptionalEnrollPaymentPhasesForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: () => {
      revalidateAccountingList();
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      assignedCount: result.assignedCount,
    }),
  });
}

export async function transferSppAction(
  _prevState: TransferSppActionState,
  formData: FormData
): Promise<TransferSppActionState> {
  return runManagerAction({
    formData,
    parse: parseTransferSppFormData,
    mutate: ({ adminClient, actor, data }) =>
      transferStudentPaymentPhaseForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      revalidateAccountingList();
      revalidateAccountingPhaseDetail(result.from_payment_phase_id);
      revalidateAccountingPhaseDetail(result.to_payment_phase_id);
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      spp_id: result.spp_id,
      from_payment_phase_id: result.from_payment_phase_id,
      to_payment_phase_id: result.to_payment_phase_id,
    }),
  });
}

export async function deleteStudentPaymentPhaseAction(
  _prevState: DeleteStudentPaymentPhaseActionState,
  formData: FormData
): Promise<DeleteStudentPaymentPhaseActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteStudentPaymentPhaseFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteSppForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingPhaseListAndDetail(result.payment_phase_id);
    },
    mapSuccess: (result) => {
      redirect(
        appendQueryParam(
          getManagerAccountingPhaseDetailRoute(result.payment_phase_id),
          "toast",
          "spp_deleted"
        )
      );
    },
  });
}
