import {
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
} from "@/lib/manager/accounting/constants";
import { resolveInProgressClassForSemester } from "@/lib/manager/accounting/resolve-in-progress-class";
import { buildInitialSppInsert } from "@/lib/manager/accounting/spp-insert";
import * as classRepository from "@/repositories/class.repository";
import type { PaymentPhaseRecord } from "@/repositories/payment-phase.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import { recalcPhaseStatusFromSpps } from "@/services/accounting-recalc.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type SyncTargetPhase = PaymentPhaseRecord;

export type EnsureSppResult = {
  spp: StudentPaymentPhaseRecord | null;
  created: boolean;
  alreadyExisted: boolean;
};

export type JoinSyncResult = {
  phase: SyncTargetPhase | null;
  spp: StudentPaymentPhaseRecord | null;
  created: boolean;
  phaseReopened: boolean;
};

export type LeaveSyncResult = {
  phase: SyncTargetPhase | null;
  spp: StudentPaymentPhaseRecord | null;
  cancelled: boolean;
};

/**
 * Resolve sync target for a class enrollment event.
 * Only the semester's in-progress class participates in payment sync.
 */
export async function findSyncTargetPhaseForClass(
  adminClient: Supabase,
  classId: string
): Promise<SyncTargetPhase | null> {
  const { data: classRow, error: classError } =
    await classRepository.findClassById(adminClient, classId);

  if (classError) {
    throw new Error(classError.message);
  }

  if (!classRow?.semester_id) {
    return null;
  }

  const billingClass = await resolveInProgressClassForSemester(
    adminClient,
    classRow.semester_id
  );

  if (!billingClass || billingClass.id !== classId) {
    return null;
  }

  const { data, error } =
    await paymentPhaseRepository.findCurrentSyncPhaseBySemesterId(
      adminClient,
      classRow.semester_id
    );

  if (error) {
    throw new Error(error.message);
  }

  return (data as SyncTargetPhase | null) ?? null;
}

/**
 * Create SPP if missing. If a cancelled (or any) SPP already exists for the
 * phase, leave it unchanged — unique (student_id, payment_phase_id).
 */
export async function ensureSppForStudentOnPhase(
  adminClient: Supabase,
  input: {
    studentId: string;
    phase: SyncTargetPhase;
    assignedAt?: string;
  }
): Promise<EnsureSppResult> {
  const { data: existing, error: existingError } =
    await studentPaymentPhaseRepository.findSppByStudentAndPhase(
      adminClient,
      input.studentId,
      input.phase.id
    );

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    return {
      spp: existing as StudentPaymentPhaseRecord,
      created: false,
      alreadyExisted: true,
    };
  }

  const sppInput = buildInitialSppInsert(
    input.studentId,
    input.phase.id,
    Number(input.phase.amount),
    input.assignedAt ?? new Date().toISOString()
  );

  const { data: created, error: createError } =
    await studentPaymentPhaseRepository.createStudentPaymentPhase(
      adminClient,
      sppInput
    );

  if (createError || !created) {
    const message = createError?.message?.toLowerCase() ?? "";
    if (message.includes("unique") || message.includes("duplicate")) {
      const { data: raced } =
        await studentPaymentPhaseRepository.findSppByStudentAndPhase(
          adminClient,
          input.studentId,
          input.phase.id
        );
      return {
        spp: (raced as StudentPaymentPhaseRecord | null) ?? null,
        created: false,
        alreadyExisted: true,
      };
    }
    throw new Error(
      createError?.message ?? "Unable to create student payment phase."
    );
  }

  return {
    spp: created as StudentPaymentPhaseRecord,
    created: true,
    alreadyExisted: false,
  };
}

export async function onStudentJoinedClass(
  adminClient: Supabase,
  input: { studentId: string; classId: string },
  actor?: AuditActor | null
): Promise<JoinSyncResult> {
  const phase = await findSyncTargetPhaseForClass(adminClient, input.classId);

  if (!phase) {
    return {
      phase: null,
      spp: null,
      created: false,
      phaseReopened: false,
    };
  }

  if (phase.status === PAYMENT_PHASE_STATUSES.CANCELLED) {
    return {
      phase: null,
      spp: null,
      created: false,
      phaseReopened: false,
    };
  }

  const wasClosed = phase.status === PAYMENT_PHASE_STATUSES.CLOSED;
  const ensured = await ensureSppForStudentOnPhase(adminClient, {
    studentId: input.studentId,
    phase,
  });

  let phaseReopened = false;

  if (wasClosed && ensured.created) {
    const { error: reopenError } =
      await paymentPhaseRepository.updatePaymentPhaseStatus(
        adminClient,
        phase.id,
        PAYMENT_PHASE_STATUSES.OPENED
      );
    if (reopenError) {
      throw new Error(reopenError.message);
    }
    phaseReopened = true;
  }

  await recalcPhaseStatusFromSpps(adminClient, phase.id);

  if (actor && ensured.created && ensured.spp) {
    await recordManagerAuditLog(adminClient, actor, {
      action: "insert",
      severity: "info",
      table_name: "student_payment_phases",
      record_id: ensured.spp.id,
      new_data: {
        student_id: ensured.spp.student_id,
        payment_phase_id: ensured.spp.payment_phase_id,
        status: ensured.spp.status,
        original_amount: ensured.spp.original_amount,
        remaining_amount: ensured.spp.remaining_amount,
      },
      metadata: {
        note: "Student payment phase created from class enrollment sync.",
        class_id: input.classId,
        semester_id: phase.semester_id,
        phase_reopened: phaseReopened,
      },
    });
  }

  if (actor && phaseReopened) {
    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "info",
      table_name: "payment_phases",
      record_id: phase.id,
      old_data: { status: PAYMENT_PHASE_STATUSES.CLOSED },
      new_data: { status: PAYMENT_PHASE_STATUSES.OPENED },
      metadata: {
        note: "Payment phase reopened after late enrollment.",
        class_id: input.classId,
        semester_id: phase.semester_id,
        student_id: input.studentId,
      },
    });
  }

  return {
    phase,
    spp: ensured.spp,
    created: ensured.created,
    phaseReopened,
  };
}

export async function onStudentLeftClass(
  adminClient: Supabase,
  input: { studentId: string; classId: string },
  actor?: AuditActor | null
): Promise<LeaveSyncResult> {
  const phase = await findSyncTargetPhaseForClass(adminClient, input.classId);

  if (!phase) {
    return { phase: null, spp: null, cancelled: false };
  }

  const { data: spp, error: sppError } =
    await studentPaymentPhaseRepository.findSppByStudentAndPhase(
      adminClient,
      input.studentId,
      phase.id
    );

  if (sppError) {
    throw new Error(sppError.message);
  }

  if (!spp) {
    return { phase, spp: null, cancelled: false };
  }

  if (spp.status === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
    return {
      phase,
      spp: spp as StudentPaymentPhaseRecord,
      cancelled: false,
    };
  }

  const { data: updated, error: updateError } =
    await studentPaymentPhaseRepository.updateStudentPaymentPhaseStatus(
      adminClient,
      spp.id,
      STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED
    );

  if (updateError || !updated) {
    throw new Error(
      updateError?.message ?? "Unable to cancel student payment phase."
    );
  }

  await recalcPhaseStatusFromSpps(adminClient, phase.id);

  if (actor) {
    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "warning",
      table_name: "student_payment_phases",
      record_id: updated.id,
      old_data: { status: spp.status },
      new_data: { status: STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED },
      metadata: {
        note: "Student payment phase cancelled from class leave sync.",
        class_id: input.classId,
        semester_id: phase.semester_id,
      },
    });
  }

  return {
    phase,
    spp: updated as StudentPaymentPhaseRecord,
    cancelled: true,
  };
}
