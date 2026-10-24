import "server-only";

import {
  PAYMENT_PHASE_STATUSES,
  STUDENT_PAYMENT_PHASE_STATUSES,
} from "@/lib/manager/accounting/constants";
import type { PaymentPhaseRecord } from "@/repositories/payment-phase.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import type { StudentPaymentPhaseRecord } from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import { createNavStepTimer } from "@/lib/debug/nav-timing";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
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
  const timer = createNavStepTimer("syncTargetPhase");
  try {
    const { data, error } = await timer.step("rpc", () =>
      paymentPhaseRepository.findSyncTargetPhaseForClass(adminClient, classId)
    );

    if (error) {
      throw new Error(error.message);
    }

    return (data as SyncTargetPhase | null) ?? null;
  } finally {
    timer.end();
  }
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
  const timer = createNavStepTimer("ensureSpp");
  try {
    const { data, error } = await timer.step("rpc", () =>
      studentPaymentPhaseRepository.ensureSppForStudentOnPhase(
        adminClient,
        input.studentId,
        input.phase.id,
        input.assignedAt
      )
    );

    if (error) {
      throw new Error(error.message);
    }

    const result = data ?? {
      spp: null,
      created: false,
      alreadyExisted: false,
      reactivated: false,
    };

    return {
      spp: result.spp,
      created: result.created,
      alreadyExisted: result.alreadyExisted,
      reactivated: result.reactivated,
    };
  } finally {
    timer.end();
  }
}

function joinSyncResultFromRpc(data: unknown): JoinSyncResult {
  const empty: JoinSyncResult = {
    phase: null,
    spp: null,
    created: false,
    reactivated: false,
    phaseReopened: false,
  };

  if (!data || typeof data !== "object") {
    return empty;
  }

  const row = data as {
    phase?: SyncTargetPhase | null;
    spp?: StudentPaymentPhaseRecord | null;
    created?: unknown;
    reactivated?: unknown;
    phaseReopened?: unknown;
  };

  return {
    phase: row.phase ?? null,
    spp: row.spp ?? null,
    created: row.created === true,
    reactivated: row.reactivated === true,
    phaseReopened: row.phaseReopened === true,
  };
}

async function auditBatchJoinSyncResults(
  adminClient: Supabase,
  actor: AuditActor,
  classId: string,
  items: StudentJoinSyncItem[]
) {
  const audited = items.filter(
    (item) =>
      item.ok && (item.created || item.reactivated || item.phaseReopened)
  );

  if (audited.length === 0) {
    return;
  }

  const created = audited.flatMap((item) => {
    if (!item.created || !item.spp) {
      return [];
    }
    return [
      {
        student_id: item.studentId,
        spp_id: item.spp.id,
        payment_phase_id: item.spp.payment_phase_id,
        status: item.spp.status,
      },
    ];
  });

  const reactivated = audited.flatMap((item) => {
    if (!item.reactivated || !item.spp) {
      return [];
    }
    return [
      {
        student_id: item.studentId,
        spp_id: item.spp.id,
        status: item.spp.status,
        remaining_amount: item.spp.remaining_amount,
      },
    ];
  });

  const phaseReopened = audited.some((item) => item.phaseReopened);
  const phase = audited.find((item) => item.phase)?.phase ?? null;

  await recordManagerAuditLog(adminClient, actor, {
    action: created.length > 0 ? "insert" : "update",
    severity: "info",
    table_name: "student_payment_phases",
    record_id: classId,
    metadata: {
      note: "Student payment phases synced from batch class enrollment.",
      class_id: classId,
      semester_id: phase?.semester_id ?? null,
      student_count: audited.length,
      created_count: created.length,
      reactivated_count: reactivated.length,
      phase_reopened: phaseReopened,
      payment_phase_id: phase?.id ?? null,
      created,
      reactivated,
    },
  });
}

async function auditJoinSyncResult(
  adminClient: Supabase,
  actor: AuditActor,
  input: { studentId: string; classId: string },
  result: JoinSyncResult
) {
  const phase = result.phase;
  const ensured = {
    spp: result.spp,
    created: result.created,
    alreadyExisted: !result.created,
    reactivated: result.reactivated,
  };
  const phaseReopened = result.phaseReopened;

  if (!(ensured.created || ensured.reactivated || phaseReopened)) {
    return;
  }

  if (ensured.created && ensured.spp) {
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
        semester_id: phase?.semester_id ?? null,
        phase_reopened: phaseReopened,
      },
    });
  }

  if (ensured.reactivated && ensured.spp) {
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
        semester_id: phase?.semester_id ?? null,
        phase_reopened: phaseReopened,
      },
    });
  }

  if (phaseReopened && phase) {
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
}

export type StudentJoinSyncItem = JoinSyncResult & {
  studentId: string;
  ok: boolean;
  error?: string;
};

function parseStudentJoinSyncItems(data: unknown): StudentJoinSyncItem[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const items: StudentJoinSyncItem[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const row = entry as { studentId?: unknown; ok?: unknown; error?: unknown };
    if (typeof row.studentId !== "string") {
      continue;
    }

    items.push({
      studentId: row.studentId,
      ok: row.ok === true,
      error: typeof row.error === "string" ? row.error : undefined,
      ...joinSyncResultFromRpc(entry),
    });
  }

  return items;
}

export async function onStudentJoinedClass(
  adminClient: Supabase,
  input: { studentId: string; classId: string },
  actor?: AuditActor | null
): Promise<JoinSyncResult> {
  const timer = createNavStepTimer("onStudentJoinedClass");
  try {
    const { data, error } = await timer.step("rpc", () =>
      studentPaymentPhaseRepository.syncStudentJoinedClass(
        adminClient,
        input.studentId,
        input.classId
      )
    );

    if (error) {
      throw new Error(error.message);
    }

    const result = joinSyncResultFromRpc(data);

    if (actor) {
      await timer.step("audit", () =>
        auditJoinSyncResult(adminClient, actor, input, result)
      );
    }

    return result;
  } finally {
    timer.end();
  }
}

export async function onStudentsJoinedClass(
  adminClient: Supabase,
  input: { classId: string; studentIds: string[] },
  actor?: AuditActor | null
): Promise<StudentJoinSyncItem[]> {
  if (input.studentIds.length === 0) {
    return [];
  }

  const timer = createNavStepTimer("onStudentsJoinedClass");
  try {
    const { data, error } = await timer.step("rpc", () =>
      studentPaymentPhaseRepository.syncStudentsJoinedClass(
        adminClient,
        input.classId,
        input.studentIds
      )
    );

    if (error) {
      throw new Error(error.message);
    }

    const items = parseStudentJoinSyncItems(data);

    if (actor) {
      await timer.step("audit", () =>
        auditBatchJoinSyncResults(adminClient, actor, input.classId, items)
      );
    }

    return items;
  } finally {
    timer.end();
  }
}

function leaveSyncResultFromRpc(data: unknown): LeaveSyncResult {
  const empty: LeaveSyncResult = {
    phase: null,
    spp: null,
    retained: false,
  };

  if (!data || typeof data !== "object") {
    return empty;
  }

  const row = data as {
    phase?: SyncTargetPhase | null;
    spp?: StudentPaymentPhaseRecord | null;
    retained?: unknown;
  };

  return {
    phase: row.phase ?? null,
    spp: row.spp ?? null,
    retained: row.retained === true,
  };
}

export async function onStudentLeftClass(
  adminClient: Supabase,
  input: { studentId: string; classId: string },
  actor?: AuditActor | null
): Promise<LeaveSyncResult> {
  const timer = createNavStepTimer("onStudentLeftClass");
  try {
    const { data, error } = await timer.step("rpc", () =>
      studentPaymentPhaseRepository.syncStudentLeftClass(
        adminClient,
        input.studentId,
        input.classId
      )
    );

    if (error) {
      throw new Error(error.message);
    }

    const result = leaveSyncResultFromRpc(data);

    if (actor && result.retained && result.spp) {
      const spp = result.spp;
      await timer.step("audit", () =>
        recordManagerAuditLog(adminClient, actor, {
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
            semester_id: result.phase?.semester_id ?? null,
            student_id: input.studentId,
          },
        })
      );
    }

    return result;
  } finally {
    timer.end();
  }
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
  const timer = createNavStepTimer("backfillSpps");
  try {
    const { data, error } = await timer.step("rpc", () =>
      studentPaymentPhaseRepository.backfillSppsForClassBecomeInProgress(
        adminClient,
        classId
      )
    );

    if (error) {
      throw new Error(error.message);
    }

    const result = data ?? {
      ensuredCount: 0,
      createdCount: 0,
      reactivatedCount: 0,
      created: [],
      reactivated: [],
      semesterId: null,
    };

    if (
      actor &&
      (result.created.length > 0 || result.reactivated.length > 0)
    ) {
      const semesterId = result.semesterId;
      await timer.step("audit", () =>
        recordManagerAuditLog(adminClient, actor, {
          action: result.created.length > 0 ? "insert" : "update",
          severity: "info",
          table_name: "student_payment_phases",
          record_id: classId,
          metadata: {
            note: "Student payment phases backfilled for class in_progress.",
            class_id: classId,
            semester_id: semesterId,
            ensured_count: result.ensuredCount,
            created_count: result.createdCount,
            reactivated_count: result.reactivatedCount,
            created: result.created.map((spp) => ({
              spp_id: spp.id,
              student_id: spp.student_id,
              payment_phase_id: spp.payment_phase_id,
              status: spp.status,
            })),
            reactivated: result.reactivated.map((spp) => ({
              spp_id: spp.id,
              student_id: spp.student_id,
              status: spp.status,
            })),
          },
        })
      );
    }

    return {
      ensuredCount: result.ensuredCount,
      createdCount: result.createdCount,
      reactivatedCount: result.reactivatedCount,
    };
  } finally {
    timer.end();
  }
}
