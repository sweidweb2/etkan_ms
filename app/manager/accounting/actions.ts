"use server";

import { revalidatePath } from "next/cache";
import { getSessionAuditActor } from "@/lib/auth/session";
import {
  getManagerAccountingPhaseDetailRoute,
  getManagerAccountingSppDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseCancelPaymentPhaseFormData } from "@/lib/validators/manager/cancel-payment-phase";
import { parseCreatePaymentPhaseFormData } from "@/lib/validators/manager/create-payment-phase";
import { parseCreateStudentPaymentFormData } from "@/lib/validators/manager/create-student-payment";
import { parseDeleteStudentPaymentFormData } from "@/lib/validators/manager/delete-student-payment";
import { parseRepairMissingSppFormData } from "@/lib/validators/manager/repair-missing-spp";
import { parseUpdatePaymentPhaseFormData } from "@/lib/validators/manager/update-payment-phase";
import { parseUpdateStudentPaymentFormData } from "@/lib/validators/manager/update-student-payment";
import {
  cancelPaymentPhaseForManager,
  createPaymentPhaseForManager,
  repairMissingSppForManager,
  updatePaymentPhaseForManager,
} from "@/services/payment-phase.service";
import {
  createStudentPaymentForManager,
  deleteStudentPaymentForManager,
  updateStudentPaymentForManager,
} from "@/services/student-payment.service";
import type {
  CancelPaymentPhaseActionState,
  CreatePaymentPhaseActionState,
  RepairMissingSppActionState,
  UpdatePaymentPhaseActionState,
} from "@/types/manager-payment-phase";
import type {
  CreateStudentPaymentActionState,
  DeleteStudentPaymentActionState,
  UpdateStudentPaymentActionState,
} from "@/types/manager-student-payment";

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

  revalidatePath(ROUTES.MANAGER_ACCOUNTING);
  revalidatePath(getManagerAccountingPhaseDetailRoute(result.payment_phase_id));
  revalidatePath(
    getManagerAccountingSppDetailRoute(
      result.payment_phase_id,
      result.payment.student_payment_phase_id
    )
  );

  return {
    success: true,
    message: result.message,
    payment: result.payment,
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

  revalidatePath(ROUTES.MANAGER_ACCOUNTING);
  revalidatePath(getManagerAccountingPhaseDetailRoute(result.payment_phase_id));
  revalidatePath(
    getManagerAccountingSppDetailRoute(
      result.payment_phase_id,
      result.payment.student_payment_phase_id
    )
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

  revalidatePath(ROUTES.MANAGER_ACCOUNTING);
  revalidatePath(getManagerAccountingPhaseDetailRoute(result.payment_phase_id));
  revalidatePath(
    getManagerAccountingSppDetailRoute(
      result.payment_phase_id,
      result.student_payment_phase_id
    )
  );

  return {
    success: true,
    message: result.message,
    student_payment_phase_id: result.student_payment_phase_id,
    payment_phase_id: result.payment_phase_id,
  };
}
