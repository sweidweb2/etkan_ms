import "server-only";

import {
  PAYMENT_PHASE_STATUSES,
} from "@/lib/manager/accounting/constants";
import { resolveInProgressClassForSemester } from "@/lib/manager/accounting/resolve-in-progress-class";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import { cancelPaymentPhaseSchema } from "@/lib/validators/manager/cancel-payment-phase";
import { createPaymentPhaseSchema } from "@/lib/validators/manager/create-payment-phase";
import { assignOptionalEnrollPaymentPhasesSchema } from "@/lib/validators/manager/assign-optional-enroll-payment-phases";
import { repairMissingSppSchema } from "@/lib/validators/manager/repair-missing-spp";
import { transferSppSchema } from "@/lib/validators/manager/transfer-spp";
import { updatePaymentPhaseSchema } from "@/lib/validators/manager/update-payment-phase";
import type { PaymentPhaseListRecord } from "@/repositories/payment-phase.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import { recalcNonCancelledSppsForPhase } from "@/services/accounting/accounting-recalc.service";
import {
  buildSppCountsByPhaseId,
  isPaymentPhaseStatus,
  mapPhaseRecordToRow,
  mapPhaseWriteError,
  toPhaseListRecord,
  type AssignOptionalEnrollPaymentPhasesResult,
  type CancelPaymentPhaseResult,
  type CreatePaymentPhaseResult,
  type RepairMissingSppResult,
  type Supabase,
  type TransferSppResult,
  type UpdatePaymentPhaseResult,
} from "@/services/accounting/payment-phase-shared";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import { getUnauthorizedError } from "@/services/auth/authorization.service";

export async function createPaymentPhaseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    name: string;
    semester_id: string;
    amount: number;
    upfront_amount: number;
    duration_months: number;
    start_date: string;
    end_date: string;
  }
): Promise<CreatePaymentPhaseResult> {
  const timer = createNavStepTimer("createPaymentPhase");
  try {
    const unauthorized = await timer.step("auth", () =>
      getUnauthorizedError(
        adminClient,
        actorUserId,
        PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE
      )
    );
    if (unauthorized) {
      return { success: false, error: unauthorized };
    }

    const parsed = createPaymentPhaseSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      };
    }

    const {
      name,
      semester_id,
      amount,
      upfront_amount,
      duration_months,
      start_date,
      end_date,
    } = parsed.data;

    const { data, error: createError } = await timer.step("rpc", () =>
      paymentPhaseRepository.createPaymentPhaseWithSpps(adminClient, {
        name: name.trim(),
        semester_id,
        amount,
        upfront_amount,
        duration_months,
        start_date,
        end_date,
      })
    );

    if (createError) {
      return mapPhaseWriteError(
        createError.message,
        "Unable to create payment phase. Please try again."
      );
    }

    if (!data?.phase) {
      return {
        success: false,
        error: "Unable to create payment phase. Please try again.",
      };
    }

    const phase = data.phase;
    const sppCount = data.sppCount;
    const billingClass = data.billingClass;

    await timer.step("audit", () =>
      recordManagerAuditLog(adminClient, actor, {
        action: "insert",
        severity: "info",
        table_name: "payment_phases",
        record_id: phase.id,
        new_data: {
          name: phase.name,
          semester_id: phase.semester_id,
          semester_code: phase.semester_code,
          amount: phase.amount,
          upfront_amount: phase.upfront_amount,
          duration_months: phase.duration_months,
          start_date: phase.start_date,
          end_date: phase.end_date,
          status: phase.status,
        },
        metadata: {
          spp_count: sppCount,
          billing_class_id: billingClass?.id ?? null,
          note: "Payment phase created.",
        },
      })
    );

    return {
      success: true,
      phase: mapPhaseRecordToRow(
        toPhaseListRecord(phase, data.semester),
        sppCount,
        0,
        billingClass
      ),
      message: "Payment phase created.",
    };
  } finally {
    timer.end();
  }
}

export async function repairMissingSppForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    payment_phase_id: string;
    student_id: string;
  }
): Promise<RepairMissingSppResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = repairMissingSppSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { payment_phase_id, student_id } = parsed.data;

  const { data, error } = await studentPaymentPhaseRepository.repairMissingSpp(
    adminClient,
    payment_phase_id,
    student_id
  );

  if (error) {
    return mapPhaseWriteError(
      error.message,
      "Unable to assign student payment phase. Please try again."
    );
  }

  if (!data) {
    return {
      success: false,
      error: "Unable to assign student payment phase. Please try again.",
    };
  }

  if (data.alreadyExisted && !data.reactivated) {
    return {
      success: true,
      message: "Student payment phase already exists.",
    };
  }

  if (!data.spp) {
    return {
      success: false,
      error: "Unable to assign student payment phase. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: data.created ? "insert" : "update",
    severity: "info",
    table_name: "student_payment_phases",
    record_id: data.spp.id,
    new_data: {
      student_id: data.spp.student_id,
      payment_phase_id: data.spp.payment_phase_id,
      status: data.spp.status,
      original_amount: data.spp.original_amount,
      remaining_amount: data.spp.remaining_amount,
    },
    metadata: {
      note: data.created
        ? "Missing student payment phase repaired."
        : "Cancelled student payment phase reactivated.",
      payment_phase_id,
      phase_reopened: data.phaseReopened,
    },
  });

  if (data.phaseReopened) {
    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "info",
      table_name: "payment_phases",
      record_id: payment_phase_id,
      old_data: { status: PAYMENT_PHASE_STATUSES.CLOSED },
      new_data: { status: PAYMENT_PHASE_STATUSES.OPENED },
      metadata: {
        note: "Payment phase reopened after assigning an unpaid student.",
        student_id,
        payment_phase_id,
      },
    });
  }

  return {
    success: true,
    message: data.phaseReopened
      ? "Student payment phase assigned and phase reopened."
      : "Student payment phase assigned.",
  };
}

export async function assignOptionalEnrollPaymentPhasesForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    student_id: string;
    payment_phase_ids: string[];
  }
): Promise<AssignOptionalEnrollPaymentPhasesResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = assignOptionalEnrollPaymentPhasesSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const uniquePhaseIds = [...new Set(parsed.data.payment_phase_ids)];
  let assignedCount = 0;

  for (const payment_phase_id of uniquePhaseIds) {
    const result = await repairMissingSppForManager(
      adminClient,
      actorUserId,
      actor,
      {
        payment_phase_id,
        student_id: parsed.data.student_id,
      }
    );

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        fieldErrors: result.fieldErrors,
      };
    }

    assignedCount += 1;
  }

  return {
    success: true,
    assignedCount,
    message:
      assignedCount === 1
        ? "Student payment phase assigned."
        : `${assignedCount} student payment phases assigned.`,
  };
}

export async function transferStudentPaymentPhaseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    spp_id: string;
    destination_payment_phase_id: string;
  }
): Promise<TransferSppResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_SPP_TRANSFER
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = transferSppSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { spp_id, destination_payment_phase_id } = parsed.data;

  const { data, error } =
    await studentPaymentPhaseRepository.transferStudentPaymentPhase(
      adminClient,
      spp_id,
      destination_payment_phase_id
    );

  if (error) {
    return mapPhaseWriteError(
      error.message,
      "Unable to transfer student payment phase. Please try again."
    );
  }

  if (
    !data?.sppId ||
    !data.studentId ||
    !data.fromPaymentPhaseId ||
    !data.toPaymentPhaseId
  ) {
    return {
      success: false,
      error: "Unable to transfer student payment phase. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_payment_phases",
    record_id: data.sppId,
    old_data: {
      payment_phase_id: data.fromPaymentPhaseId,
    },
    new_data: {
      payment_phase_id: data.toPaymentPhaseId,
    },
    metadata: {
      note: "SPP transferred between payment phases.",
      student_id: data.studentId,
      from_payment_phase_id: data.fromPaymentPhaseId,
      to_payment_phase_id: data.toPaymentPhaseId,
    },
  });

  return {
    success: true,
    message: "Student payment phase transferred.",
    spp_id: data.sppId,
    from_payment_phase_id: data.fromPaymentPhaseId,
    to_payment_phase_id: data.toPaymentPhaseId,
  };
}

export async function updatePaymentPhaseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    id: string;
    name: string;
    amount: number;
    upfront_amount: number;
    duration_months: number;
    start_date: string;
    end_date: string;
  }
): Promise<UpdatePaymentPhaseResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updatePaymentPhaseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await paymentPhaseRepository.findPaymentPhaseById(
    adminClient,
    parsed.data.id
  );

  if (existing.error) {
    return {
      success: false,
      error: "Unable to update payment phase. Please try again.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Payment phase not found." };
  }

  const existingRecord = existing.data as PaymentPhaseListRecord;

  if (existingRecord.status === PAYMENT_PHASE_STATUSES.CANCELLED) {
    return {
      success: false,
      error: "Cancelled payment phases cannot be edited.",
    };
  }

  const oldData = {
    name: existingRecord.name,
    amount: existingRecord.amount,
    upfront_amount: existingRecord.upfront_amount,
    duration_months: existingRecord.duration_months,
    start_date: existingRecord.start_date,
    end_date: existingRecord.end_date,
    status: existingRecord.status,
  };

  const { data: updated, error: updateError } =
    await paymentPhaseRepository.updatePaymentPhase(
      adminClient,
      parsed.data.id,
      {
        name: parsed.data.name.trim(),
        amount: parsed.data.amount,
        upfront_amount: parsed.data.upfront_amount,
        duration_months: parsed.data.duration_months,
        start_date: parsed.data.start_date,
        end_date: parsed.data.end_date,
      }
    );

  if (updateError || !updated) {
    return {
      success: false,
      error: "Unable to update payment phase. Please try again.",
    };
  }

  const updatedRecord = updated as PaymentPhaseListRecord;

  const currentPhaseStatus = isPaymentPhaseStatus(updatedRecord.status)
    ? updatedRecord.status
    : PAYMENT_PHASE_STATUSES.OPENED;

  let sppRecalculated = 0;
  let nextPhaseStatus = currentPhaseStatus;

  try {
    const recalc = await recalcNonCancelledSppsForPhase(
      adminClient,
      updatedRecord.id
    );
    sppRecalculated = recalc.sppRecalculated;
    nextPhaseStatus = recalc.nextPhaseStatus;
  } catch {
    return {
      success: false,
      error:
        "Payment phase updated, but student payment phases could not be recalculated.",
    };
  }

  const finalRecord =
    nextPhaseStatus !== currentPhaseStatus
      ? { ...updatedRecord, status: nextPhaseStatus }
      : updatedRecord;

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "payment_phases",
    record_id: finalRecord.id,
    old_data: oldData,
    new_data: {
      name: finalRecord.name,
      amount: finalRecord.amount,
      upfront_amount: finalRecord.upfront_amount,
      duration_months: finalRecord.duration_months,
      start_date: finalRecord.start_date,
      end_date: finalRecord.end_date,
      status: finalRecord.status,
    },
    metadata: {
      spp_recalculated: sppRecalculated,
      note: "Payment phase updated.",
    },
  });

  const sppCounts = await buildSppCountsByPhaseId(adminClient, [finalRecord]);
  const counts = sppCounts.get(finalRecord.id) ?? { active: 0, paid: 0 };
  const billingClass = await resolveInProgressClassForSemester(
    adminClient,
    finalRecord.semester_id
  );

  return {
    success: true,
    phase: mapPhaseRecordToRow(
      finalRecord,
      counts.active,
      counts.paid,
      billingClass
        ? { id: billingClass.id, name: billingClass.name }
        : null
    ),
    message: "Payment phase updated.",
  };
}

export async function cancelPaymentPhaseForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: {
    payment_phase_id: string;
  }
): Promise<CancelPaymentPhaseResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CANCEL
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = cancelPaymentPhaseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { data, error } = await paymentPhaseRepository.cancelPaymentPhase(
    adminClient,
    parsed.data.payment_phase_id
  );

  if (error) {
    return mapPhaseWriteError(
      error.message,
      "Unable to cancel payment phase. Please try again."
    );
  }

  if (!data?.phase) {
    return {
      success: false,
      error: "Unable to cancel payment phase. Please try again.",
    };
  }

  const cancelledRecord = toPhaseListRecord(data.phase, data.semester);

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "payment_phases",
    record_id: cancelledRecord.id,
    old_data: { status: data.previousStatus },
    new_data: { status: cancelledRecord.status },
    metadata: {
      note: "Payment phase cancelled.",
    },
  });

  return {
    success: true,
    phase: mapPhaseRecordToRow(
      cancelledRecord,
      data.sppActiveCount,
      data.sppPaidCount,
      data.billingClass
    ),
    message: "Payment phase cancelled.",
  };
}
