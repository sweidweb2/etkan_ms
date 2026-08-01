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
import * as studentClassRepository from "@/repositories/student-class.repository";
import {
  recalcPhaseStatusFromSpps,
  recalcSingleSpp,
} from "@/services/accounting-recalc.service";
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
  reactivated: boolean;
};

export type JoinSyncResult = {
  phase: SyncTargetPhase | null;
  spp: StudentPaymentPhaseRecord | null;
  created: boolean;
  reactivated: boolean;
  phaseReopened: boolean;
};

export type LeaveSyncResult = {
  phase: SyncTargetPhase | null;
  spp: StudentPaymentPhaseRecord | null;
  /** True when an active (non-cancelled) SPP was kept after leave. */
  retained: boolean;
};

export type BackfillSppsResult = {
  ensuredCount: number;
  createdCount: number;
  reactivatedCount: number;
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
 * Create SPP if missing. Reactivate a cancelled SPP (recalc from payments /
 * adjustments). Other existing rows stay unchanged — unique (student_id, phase).
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
    if (existing.status === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
      const { data: pendingRow, error: uncancelError } =
        await studentPaymentPhaseRepository.updateStudentPaymentPhaseStatus(
          adminClient,
          existing.id,
          STUDENT_PAYMENT_PHASE_STATUSES.PENDING
        );

      if (uncancelError || !pendingRow) {
        throw new Error(
          uncancelError?.message ??
            "Unable to reactivate student payment phase."
        );
      }

      const reactivated = await recalcSingleSpp(adminClient, existing.id);

      return {
        spp: reactivated,
        created: false,
        alreadyExisted: true,
        reactivated: true,
      };
    }

    return {
      spp: existing as StudentPaymentPhaseRecord,
      created: false,
      alreadyExisted: true,
      reactivated: false,
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

      if (
        raced &&
        raced.status === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED
      ) {
        const { data: pendingRow, error: uncancelError } =
          await studentPaymentPhaseRepository.updateStudentPaymentPhaseStatus(
            adminClient,
            raced.id,
            STUDENT_PAYMENT_PHASE_STATUSES.PENDING
          );

        if (uncancelError || !pendingRow) {
          throw new Error(
            uncancelError?.message ??
              "Unable to reactivate student payment phase."
          );
        }

        const reactivated = await recalcSingleSpp(adminClient, raced.id);

        return {
          spp: reactivated,
          created: false,
          alreadyExisted: true,
          reactivated: true,
        };
      }

      return {
        spp: (raced as StudentPaymentPhaseRecord | null) ?? null,
        created: false,
        alreadyExisted: true,
        reactivated: false,
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
    reactivated: false,
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
      reactivated: false,
      phaseReopened: false,
    };
  }

  if (phase.status === PAYMENT_PHASE_STATUSES.CANCELLED) {
    return {
      phase: null,
      spp: null,
      created: false,
      reactivated: false,
      phaseReopened: false,
    };
  }

  const wasClosed = phase.status === PAYMENT_PHASE_STATUSES.CLOSED;
  const ensured = await ensureSppForStudentOnPhase(adminClient, {
    studentId: input.studentId,
    phase,
  });

  const sppNeedsBilling =
    !!ensured.spp &&
    ensured.spp.status !== STUDENT_PAYMENT_PHASE_STATUSES.PAID &&
    ensured.spp.status !== STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED;

  let phaseReopened = false;
  const shouldReopenPhase =
    wasClosed &&
    (ensured.created ||
      ensured.reactivated ||
      (ensured.alreadyExisted && sppNeedsBilling));

  if (shouldReopenPhase) {
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

  if (actor && ensured.reactivated && ensured.spp) {
    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "info",
      table_name: "student_payment_phases",
      record_id: ensured.spp.id,
      old_data: { status: STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED },
      new_data: {
        status: ensured.spp.status,
        remaining_amount: ensured.spp.remaining_amount,
      },
      metadata: {
        note: "Student payment phase reactivated after re-enrollment.",
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
        spp_reused:
          ensured.alreadyExisted && !ensured.created && !ensured.reactivated,
      },
    });
  }

  return {
    phase,
    spp: ensured.spp,
    created: ensured.created,
    reactivated: ensured.reactivated,
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
    return { phase: null, spp: null, retained: false };
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
    return { phase, spp: null, retained: false };
  }

  if (spp.status === STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED) {
    return {
      phase,
      spp: spp as StudentPaymentPhaseRecord,
      retained: false,
    };
  }

  await recalcPhaseStatusFromSpps(adminClient, phase.id);

  if (actor) {
    await recordManagerAuditLog(adminClient, actor, {
      action: "update",
      severity: "info",
      table_name: "student_payment_phases",
      record_id: spp.id,
      old_data: {
        status: spp.status,
        remaining_amount: spp.remaining_amount,
      },
      new_data: {
        status: spp.status,
        remaining_amount: spp.remaining_amount,
      },
      metadata: {
        note: "Student left class; SPP retained.",
        spp_id: spp.id,
        class_id: input.classId,
        semester_id: phase.semester_id,
        student_id: input.studentId,
      },
    });
  }

  return {
    phase,
    spp: spp as StudentPaymentPhaseRecord,
    retained: true,
  };
}

/**
 * When a class becomes the semester's in-progress billing class, ensure SPPs
 * for all currently enrolled students on the semester's sync payment phase.
 */
export async function backfillSppsForClassBecomeInProgress(
  adminClient: Supabase,
  classId: string,
  actor?: AuditActor | null
): Promise<BackfillSppsResult> {
  const phase = await findSyncTargetPhaseForClass(adminClient, classId);

  if (!phase || phase.status === PAYMENT_PHASE_STATUSES.CANCELLED) {
    return { ensuredCount: 0, createdCount: 0, reactivatedCount: 0 };
  }

  const { data: enrolledRows, error: enrolledError } =
    await studentClassRepository.listMemberUserIdsByClassId(
      adminClient,
      classId
    );

  if (enrolledError) {
    throw new Error(enrolledError.message);
  }

  const studentIds = [
    ...new Set((enrolledRows ?? []).map((row) => row.user_id)),
  ];

  let createdCount = 0;
  let reactivatedCount = 0;

  for (const studentId of studentIds) {
    const ensured = await ensureSppForStudentOnPhase(adminClient, {
      studentId,
      phase,
    });

    if (ensured.created) {
      createdCount += 1;
      if (actor && ensured.spp) {
        await recordManagerAuditLog(adminClient, actor, {
          action: "insert",
          severity: "info",
          table_name: "student_payment_phases",
          record_id: ensured.spp.id,
          new_data: {
            student_id: ensured.spp.student_id,
            payment_phase_id: ensured.spp.payment_phase_id,
            status: ensured.spp.status,
          },
          metadata: {
            note: "Student payment phase created from class in_progress backfill.",
            class_id: classId,
            semester_id: phase.semester_id,
          },
        });
      }
    } else if (ensured.reactivated) {
      reactivatedCount += 1;
      if (actor && ensured.spp) {
        await recordManagerAuditLog(adminClient, actor, {
          action: "update",
          severity: "info",
          table_name: "student_payment_phases",
          record_id: ensured.spp.id,
          old_data: { status: STUDENT_PAYMENT_PHASE_STATUSES.CANCELLED },
          new_data: { status: ensured.spp.status },
          metadata: {
            note: "Student payment phase reactivated from class in_progress backfill.",
            class_id: classId,
            semester_id: phase.semester_id,
          },
        });
      }
    }
  }

  if (studentIds.length > 0) {
    const wasClosed = phase.status === PAYMENT_PHASE_STATUSES.CLOSED;
    if (wasClosed && (createdCount > 0 || reactivatedCount > 0)) {
      const { error: reopenError } =
        await paymentPhaseRepository.updatePaymentPhaseStatus(
          adminClient,
          phase.id,
          PAYMENT_PHASE_STATUSES.OPENED
        );
      if (reopenError) {
        throw new Error(reopenError.message);
      }
    }

    await recalcPhaseStatusFromSpps(adminClient, phase.id);
  }

  return {
    ensuredCount: studentIds.length,
    createdCount,
    reactivatedCount,
  };
}
