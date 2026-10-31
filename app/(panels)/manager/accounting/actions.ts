"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { runManagerAction } from "@/lib/actions/run-manager-action";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  getManagerAccountingPhaseDetailRoute,
  getManagerAccountingSppDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { appendQueryParam } from "@/lib/url/append-query-param";
import { parseCancelPaymentPhaseFormData } from "@/lib/validators/manager/cancel-payment-phase";
import { parseCreatePaymentPhaseFormData } from "@/lib/validators/manager/create-payment-phase";
import {
  parseCreateFinancialAdjustmentFormData,
  parseUpdateFinancialAdjustmentFormData,
} from "@/lib/validators/manager/create-financial-adjustment";
import { parseImportFinancialAdjustmentFormData } from "@/lib/validators/manager/import-financial-adjustment";
import { parseCreateStudentPaymentFormData } from "@/lib/validators/manager/create-student-payment";
import { parseCreateStudentPaymentScheduleFormData } from "@/lib/validators/manager/create-student-payment-schedule";
import { parseDeleteFinancialAdjustmentFormData } from "@/lib/validators/manager/delete-financial-adjustment";
import { parseDeleteFinancialFormFormData } from "@/lib/validators/manager/delete-financial-form";
import { parseDeleteFinancialFormInviteFormData } from "@/lib/validators/manager/delete-financial-form-invite";
import { parseDeleteStudentPaymentFormData } from "@/lib/validators/manager/delete-student-payment";
import { parseDeleteStudentPaymentScheduleFormData } from "@/lib/validators/manager/delete-student-payment-schedule";
import { parseDeleteSppClearanceFormData } from "@/lib/validators/manager/delete-spp-clearance";
import { parseBulkCreateSppClearancesFormData } from "@/lib/validators/manager/bulk-create-spp-clearances";
import { parseBulkDeleteSppClearancesFormData } from "@/lib/validators/manager/bulk-delete-spp-clearances";
import {
  parseCreateSppClearanceFormData,
  parseUpdateSppClearanceFormData,
} from "@/lib/validators/manager/upsert-spp-clearance";
import { parseDeleteStudentPaymentPhaseFormData } from "@/lib/validators/manager/delete-student-payment-phase";
import { parseRepairMissingSppFormData } from "@/lib/validators/manager/repair-missing-spp";
import { parseAssignOptionalEnrollPaymentPhasesFormData } from "@/lib/validators/manager/assign-optional-enroll-payment-phases";
import { parseTransferSppFormData } from "@/lib/validators/manager/transfer-spp";
import { parseUpdatePaymentPhaseFormData } from "@/lib/validators/manager/update-payment-phase";
import { parseUpdateStudentPaymentFormData } from "@/lib/validators/manager/update-student-payment";
import { parseUpdateStudentPaymentScheduleFormData } from "@/lib/validators/manager/update-student-payment-schedule";
import { parseProcessDropRefundFormData } from "@/lib/validators/manager/parse-semester-drop-form";
import { processDropRefundForManager } from "@/services/accounting/drop-refund.service";
import {
  parseCreateFinancialFormFormData,
  parseCreateFinancialFormInviteFormData,
  parseUpdateFinancialFormFormData,
} from "@/lib/validators/manager/upsert-financial-form";
import {
  assignOptionalEnrollPaymentPhasesForManager,
  cancelPaymentPhaseForManager,
  createPaymentPhaseForManager,
  listPaymentPhaseSemesterOptionsForManager,
  repairMissingSppForManager,
  transferStudentPaymentPhaseForManager,
  updatePaymentPhaseForManager,
} from "@/services/accounting/payment-phase.service";
import {
  createAdjustmentForManager,
  createFinancialFormForManager,
  createFinancialFormInviteForManager,
  deleteAdjustmentForManager,
  deleteFinancialFormForManager,
  deleteFinancialFormInviteForManager,
  importAdjustmentForManager,
  listImportableAdjustmentsForManager,
  updateAdjustmentForManager,
  updateFinancialFormForManager,
} from "@/services/accounting/student-financial-adjustment.service";
import {
  createStudentPaymentForManager,
  deleteSppForManager,
  deleteStudentPaymentForManager,
  updateStudentPaymentForManager,
} from "@/services/accounting/student-payment.service";
import {
  createStudentPaymentScheduleForManager,
  deleteStudentPaymentScheduleForManager,
  updateStudentPaymentScheduleForManager,
} from "@/services/accounting/student-payment-schedule.service";
import {
  bulkCreateSppClearancesForManager,
  bulkDeleteSppClearancesForManager,
  createSppClearanceForManager,
  deleteSppClearanceForManager,
  updateSppClearanceForManager,
} from "@/services/accounting/spp-clearance.service";
import type {
  CreateFinancialAdjustmentActionState,
  CreateFinancialFormInviteActionState,
  DeleteFinancialAdjustmentActionState,
  DeleteFinancialFormActionState,
  DeleteFinancialFormInviteActionState,
  ImportFinancialAdjustmentActionState,
  ManagerImportableAdjustmentRow,
  UpdateFinancialAdjustmentActionState,
  UpsertFinancialFormActionState,
} from "@/types/manager-financial-adjustment";
import type {
  AssignOptionalEnrollPaymentPhasesActionState,
  CancelPaymentPhaseActionState,
  CreatePaymentPhaseActionState,
  ManagerPaymentPhaseSemesterOption,
  RepairMissingSppActionState,
  TransferSppActionState,
  UpdatePaymentPhaseActionState,
} from "@/types/manager-payment-phase";
import type {
  CreateStudentPaymentActionState,
  DeleteStudentPaymentActionState,
  DeleteStudentPaymentPhaseActionState,
  UpdateStudentPaymentActionState,
} from "@/types/manager-student-payment";
import type {
  CreateStudentPaymentScheduleActionState,
  DeleteStudentPaymentScheduleActionState,
  UpdateStudentPaymentScheduleActionState,
} from "@/types/manager-student-payment-schedule";
import type {
  BulkCreateSppClearancesActionState,
  BulkDeleteSppClearancesActionState,
  DeleteSppClearanceActionState,
  UpsertSppClearanceActionState,
} from "@/types/manager-spp-clearance";
import type { ManagerSemesterDropRequestRow } from "@/types/manager-semester-drop";

function revalidateAccountingList() {
  revalidatePath(ROUTES.MANAGER_ACCOUNTING);
}

function revalidateAccountingPhaseDetail(phaseId: string) {
  revalidatePath(getManagerAccountingPhaseDetailRoute(phaseId));
}

function revalidateAccountingSppDetail(phaseId: string, sppId: string) {
  revalidateAccountingPhaseDetail(phaseId);
  revalidatePath(getManagerAccountingSppDetailRoute(phaseId, sppId));
}

function revalidateAccountingPhaseListAndDetail(phaseId: string) {
  revalidateAccountingList();
  revalidateAccountingPhaseDetail(phaseId);
}

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

export async function createStudentPaymentAction(
  _prevState: CreateStudentPaymentActionState,
  formData: FormData
): Promise<CreateStudentPaymentActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateStudentPaymentFormData,
    mutate: ({ adminClient, actor, data }) =>
      createStudentPaymentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.payment.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      payment: result.payment,
      spp: result.spp,
    }),
  });
}

export async function updateStudentPaymentAction(
  _prevState: UpdateStudentPaymentActionState,
  formData: FormData
): Promise<UpdateStudentPaymentActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateStudentPaymentFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateStudentPaymentForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.payment.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      payment: result.payment,
    }),
  });
}

export async function deleteStudentPaymentAction(
  _prevState: DeleteStudentPaymentActionState,
  formData: FormData
): Promise<DeleteStudentPaymentActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteStudentPaymentFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteStudentPaymentForManager(adminClient, actor.userId, actor, data),
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
    }),
  });
}

export async function createStudentPaymentScheduleAction(
  _prevState: CreateStudentPaymentScheduleActionState,
  formData: FormData
): Promise<CreateStudentPaymentScheduleActionState> {
  const paymentPhaseId = String(formData.get("payment_phase_id") ?? "");

  return runManagerAction({
    formData,
    parse: parseCreateStudentPaymentScheduleFormData,
    mutate: ({ adminClient, actor, data }) =>
      createStudentPaymentScheduleForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      if (paymentPhaseId) {
        revalidateAccountingSppDetail(
          paymentPhaseId,
          result.student_payment_phase_id
        );
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      schedule: result.schedule,
    }),
  });
}

export async function updateStudentPaymentScheduleAction(
  _prevState: UpdateStudentPaymentScheduleActionState,
  formData: FormData
): Promise<UpdateStudentPaymentScheduleActionState> {
  const paymentPhaseId = String(formData.get("payment_phase_id") ?? "");

  return runManagerAction({
    formData,
    parse: parseUpdateStudentPaymentScheduleFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateStudentPaymentScheduleForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      if (paymentPhaseId) {
        revalidateAccountingSppDetail(
          paymentPhaseId,
          result.student_payment_phase_id
        );
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      schedule: result.schedule,
    }),
  });
}

export async function deleteStudentPaymentScheduleAction(
  _prevState: DeleteStudentPaymentScheduleActionState,
  formData: FormData
): Promise<DeleteStudentPaymentScheduleActionState> {
  const paymentPhaseId = String(formData.get("payment_phase_id") ?? "");

  return runManagerAction({
    formData,
    parse: parseDeleteStudentPaymentScheduleFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteStudentPaymentScheduleForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      if (paymentPhaseId) {
        revalidateAccountingSppDetail(
          paymentPhaseId,
          result.student_payment_phase_id
        );
      }
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      student_payment_phase_id: result.student_payment_phase_id,
    }),
  });
}

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
    }),
  });
}

export async function createFinancialFormAction(
  _prevState: UpsertFinancialFormActionState,
  formData: FormData
): Promise<UpsertFinancialFormActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateFinancialFormFormData,
    mutate: ({ adminClient, actor, data }) =>
      createFinancialFormForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      form: result.form,
      student_payment_phase_id: result.student_payment_phase_id,
      payment_phase_id: result.payment_phase_id,
    }),
  });
}

export async function updateFinancialFormAction(
  _prevState: UpsertFinancialFormActionState,
  formData: FormData
): Promise<UpsertFinancialFormActionState> {
  return runManagerAction({
    formData,
    parse: parseUpdateFinancialFormFormData,
    mutate: ({ adminClient, actor, data }) =>
      updateFinancialFormForManager(adminClient, actor.userId, actor, data),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      form: result.form,
      student_payment_phase_id: result.student_payment_phase_id,
      payment_phase_id: result.payment_phase_id,
    }),
  });
}

export async function createFinancialFormInviteAction(
  _prevState: CreateFinancialFormInviteActionState,
  formData: FormData
): Promise<CreateFinancialFormInviteActionState> {
  return runManagerAction({
    formData,
    parse: parseCreateFinancialFormInviteFormData,
    mutate: ({ adminClient, actor, data }) =>
      createFinancialFormInviteForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
    revalidate: (result) => {
      revalidateAccountingSppDetail(
        result.payment_phase_id,
        result.student_payment_phase_id
      );
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      invite: result.invite,
      student_payment_phase_id: result.student_payment_phase_id,
      payment_phase_id: result.payment_phase_id,
    }),
  });
}

export async function deleteFinancialFormInviteAction(
  _prevState: DeleteFinancialFormInviteActionState,
  formData: FormData
): Promise<DeleteFinancialFormInviteActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteFinancialFormInviteFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteFinancialFormInviteForManager(
        adminClient,
        actor.userId,
        actor,
        data
      ),
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
    }),
  });
}

export async function deleteFinancialFormAction(
  _prevState: DeleteFinancialFormActionState,
  formData: FormData
): Promise<DeleteFinancialFormActionState> {
  return runManagerAction({
    formData,
    parse: parseDeleteFinancialFormFormData,
    mutate: ({ adminClient, actor, data }) =>
      deleteFinancialFormForManager(adminClient, actor.userId, actor, data),
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
    }),
  });
}

export type ProcessDropRefundActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  request?: ManagerSemesterDropRequestRow;
};

export async function processDropRefundAction(
  _prevState: ProcessDropRefundActionState,
  formData: FormData
): Promise<ProcessDropRefundActionState> {
  return runManagerAction({
    formData,
    parse: parseProcessDropRefundFormData,
    mutate: ({ adminClient, actor, data }) =>
      processDropRefundForManager(adminClient, actor.userId, actor, data),
    revalidate: () => {
      revalidatePath(ROUTES.MANAGER_ACCOUNTING);
      revalidatePath("/manager/income-statement");
    },
    mapSuccess: (result) => ({
      success: true,
      message: result.message,
      request: result.request,
    }),
  });
}
