"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
import { parseDeleteStudentPaymentPhaseFormData } from "@/lib/validators/manager/delete-student-payment-phase";
import { parseRepairMissingSppFormData } from "@/lib/validators/manager/repair-missing-spp";
import { parseTransferSppFormData } from "@/lib/validators/manager/transfer-spp";
import { parseUpdatePaymentPhaseFormData } from "@/lib/validators/manager/update-payment-phase";
import { parseUpdateStudentPaymentFormData } from "@/lib/validators/manager/update-student-payment";
import { parseUpdateStudentPaymentScheduleFormData } from "@/lib/validators/manager/update-student-payment-schedule";
import {
  parseCreateFinancialFormFormData,
  parseCreateFinancialFormInviteFormData,
  parseUpdateFinancialFormFormData,
} from "@/lib/validators/manager/upsert-financial-form";
import {
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

  revalidateAccountingList();

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

  revalidateAccountingList();

  return {
    success: true,
    message: result.message,
  };
}

export async function transferSppAction(
  _prevState: TransferSppActionState,
  formData: FormData
): Promise<TransferSppActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseTransferSppFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await transferStudentPaymentPhaseForManager(
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

  revalidateAccountingList();
  revalidateAccountingPhaseDetail(result.from_payment_phase_id);
  revalidateAccountingPhaseDetail(result.to_payment_phase_id);

  return {
    success: true,
    message: result.message,
    spp_id: result.spp_id,
    from_payment_phase_id: result.from_payment_phase_id,
    to_payment_phase_id: result.to_payment_phase_id,
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

  revalidateAccountingPhaseListAndDetail(result.phase.id);

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

  revalidateAccountingPhaseListAndDetail(result.phase.id);

  return {
    success: true,
    message: result.message,
    phase: result.phase,
  };
}

export async function createStudentPaymentAction(
  _prevState: CreateStudentPaymentActionState,
  formData: FormData
): Promise<CreateStudentPaymentActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateStudentPaymentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createStudentPaymentForManager(
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

  revalidateAccountingSppDetail(
    result.payment_phase_id,
    result.payment.student_payment_phase_id
  );

  return {
    success: true,
    message: result.message,
    payment: result.payment,
    spp: result.spp,
  };
}

export async function updateStudentPaymentAction(
  _prevState: UpdateStudentPaymentActionState,
  formData: FormData
): Promise<UpdateStudentPaymentActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateStudentPaymentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateStudentPaymentForManager(
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

  revalidateAccountingSppDetail(
    result.payment_phase_id,
    result.payment.student_payment_phase_id
  );

  return {
    success: true,
    message: result.message,
    payment: result.payment,
  };
}

export async function deleteStudentPaymentAction(
  _prevState: DeleteStudentPaymentActionState,
  formData: FormData
): Promise<DeleteStudentPaymentActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseDeleteStudentPaymentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteStudentPaymentForManager(
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

  revalidateAccountingSppDetail(
    result.payment_phase_id,
    result.student_payment_phase_id
  );

  return {
    success: true,
    message: result.message,
    student_payment_phase_id: result.student_payment_phase_id,
    payment_phase_id: result.payment_phase_id,
  };
}

export async function createStudentPaymentScheduleAction(
  _prevState: CreateStudentPaymentScheduleActionState,
  formData: FormData
): Promise<CreateStudentPaymentScheduleActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateStudentPaymentScheduleFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createStudentPaymentScheduleForManager(
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

  const paymentPhaseId = String(formData.get("payment_phase_id") ?? "");
  if (paymentPhaseId) {
    revalidateAccountingSppDetail(
      paymentPhaseId,
      result.student_payment_phase_id
    );
  }

  return {
    success: true,
    message: result.message,
    schedule: result.schedule,
  };
}

export async function updateStudentPaymentScheduleAction(
  _prevState: UpdateStudentPaymentScheduleActionState,
  formData: FormData
): Promise<UpdateStudentPaymentScheduleActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateStudentPaymentScheduleFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateStudentPaymentScheduleForManager(
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

  const paymentPhaseId = String(formData.get("payment_phase_id") ?? "");
  if (paymentPhaseId) {
    revalidateAccountingSppDetail(
      paymentPhaseId,
      result.student_payment_phase_id
    );
  }

  return {
    success: true,
    message: result.message,
    schedule: result.schedule,
  };
}

export async function deleteStudentPaymentScheduleAction(
  _prevState: DeleteStudentPaymentScheduleActionState,
  formData: FormData
): Promise<DeleteStudentPaymentScheduleActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseDeleteStudentPaymentScheduleFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteStudentPaymentScheduleForManager(
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

  const paymentPhaseId = String(formData.get("payment_phase_id") ?? "");
  if (paymentPhaseId) {
    revalidateAccountingSppDetail(
      paymentPhaseId,
      result.student_payment_phase_id
    );
  }

  return {
    success: true,
    message: result.message,
    student_payment_phase_id: result.student_payment_phase_id,
  };
}

export async function deleteStudentPaymentPhaseAction(
  _prevState: DeleteStudentPaymentPhaseActionState,
  formData: FormData
): Promise<DeleteStudentPaymentPhaseActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseDeleteStudentPaymentPhaseFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteSppForManager(
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

  revalidateAccountingPhaseListAndDetail(result.payment_phase_id);

  redirect(
    appendQueryParam(
      getManagerAccountingPhaseDetailRoute(result.payment_phase_id),
      "toast",
      "spp_deleted"
    )
  );
}

export async function createFinancialAdjustmentAction(
  _prevState: CreateFinancialAdjustmentActionState,
  formData: FormData
): Promise<CreateFinancialAdjustmentActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateFinancialAdjustmentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createAdjustmentForManager(
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

  revalidateAccountingSppDetail(
    result.payment_phase_id,
    result.student_payment_phase_id
  );

  return {
    success: true,
    message: result.message,
    adjustment: result.adjustment,
  };
}

export async function importFinancialAdjustmentAction(
  _prevState: ImportFinancialAdjustmentActionState,
  formData: FormData
): Promise<ImportFinancialAdjustmentActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseImportFinancialAdjustmentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await importAdjustmentForManager(
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

  revalidateAccountingSppDetail(
    result.payment_phase_id,
    result.student_payment_phase_id
  );
  revalidateAccountingList();

  return {
    success: true,
    message: result.message,
    adjustment: result.adjustment,
  };
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
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateFinancialAdjustmentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateAdjustmentForManager(
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

  revalidateAccountingSppDetail(
    result.payment_phase_id,
    result.student_payment_phase_id
  );

  return {
    success: true,
    message: result.message,
    adjustment: result.adjustment,
  };
}

export async function deleteFinancialAdjustmentAction(
  _prevState: DeleteFinancialAdjustmentActionState,
  formData: FormData
): Promise<DeleteFinancialAdjustmentActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseDeleteFinancialAdjustmentFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteAdjustmentForManager(
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

  revalidateAccountingSppDetail(
    result.payment_phase_id,
    result.student_payment_phase_id
  );

  return {
    success: true,
    message: result.message,
    student_payment_phase_id: result.student_payment_phase_id,
    payment_phase_id: result.payment_phase_id,
  };
}

export async function createFinancialFormAction(
  _prevState: UpsertFinancialFormActionState,
  formData: FormData
): Promise<UpsertFinancialFormActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateFinancialFormFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createFinancialFormForManager(
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

  revalidateAccountingSppDetail(
    result.payment_phase_id,
    result.student_payment_phase_id
  );

  return {
    success: true,
    message: result.message,
    form: result.form,
    student_payment_phase_id: result.student_payment_phase_id,
    payment_phase_id: result.payment_phase_id,
  };
}

export async function updateFinancialFormAction(
  _prevState: UpsertFinancialFormActionState,
  formData: FormData
): Promise<UpsertFinancialFormActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseUpdateFinancialFormFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await updateFinancialFormForManager(
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

  revalidateAccountingSppDetail(
    result.payment_phase_id,
    result.student_payment_phase_id
  );

  return {
    success: true,
    message: result.message,
    form: result.form,
    student_payment_phase_id: result.student_payment_phase_id,
    payment_phase_id: result.payment_phase_id,
  };
}

export async function createFinancialFormInviteAction(
  _prevState: CreateFinancialFormInviteActionState,
  formData: FormData
): Promise<CreateFinancialFormInviteActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseCreateFinancialFormInviteFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await createFinancialFormInviteForManager(
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

  revalidateAccountingSppDetail(
    result.payment_phase_id,
    result.student_payment_phase_id
  );

  return {
    success: true,
    message: result.message,
    invite: result.invite,
    student_payment_phase_id: result.student_payment_phase_id,
    payment_phase_id: result.payment_phase_id,
  };
}

export async function deleteFinancialFormInviteAction(
  _prevState: DeleteFinancialFormInviteActionState,
  formData: FormData
): Promise<DeleteFinancialFormInviteActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseDeleteFinancialFormInviteFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteFinancialFormInviteForManager(
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

  revalidateAccountingSppDetail(
    result.payment_phase_id,
    result.student_payment_phase_id
  );

  return {
    success: true,
    message: result.message,
    student_payment_phase_id: result.student_payment_phase_id,
    payment_phase_id: result.payment_phase_id,
  };
}

export async function deleteFinancialFormAction(
  _prevState: DeleteFinancialFormActionState,
  formData: FormData
): Promise<DeleteFinancialFormActionState> {
  const actor = await getSessionAuditActor();
  const parsed = parseDeleteFinancialFormFormData(formData);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error,
      fieldErrors: parsed.fieldErrors,
    };
  }

  const adminClient = createSupabaseAdminClient();
  const result = await deleteFinancialFormForManager(
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

  revalidateAccountingSppDetail(
    result.payment_phase_id,
    result.student_payment_phase_id
  );

  return {
    success: true,
    message: result.message,
    student_payment_phase_id: result.student_payment_phase_id,
    payment_phase_id: result.payment_phase_id,
  };
}
