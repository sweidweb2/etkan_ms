import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SPP_COLUMNS =
  "id, student_id, payment_phase_id, assigned_at, status, original_amount, adjustment_amount, final_amount_due, total_paid, remaining_amount, created_at, updated_at";

export type StudentPaymentPhaseRecord = {
  id: string;
  student_id: string;
  payment_phase_id: string;
  assigned_at: string;
  status: string;
  original_amount: number;
  adjustment_amount: number;
  final_amount_due: number;
  total_paid: number;
  remaining_amount: number;
  created_at: string;
  updated_at: string;
};

export type CreateStudentPaymentPhaseRecordInput = {
  student_id: string;
  payment_phase_id: string;
  assigned_at: string;
  status: string;
  original_amount: number;
  adjustment_amount: number;
  final_amount_due: number;
  total_paid: number;
  remaining_amount: number;
};

export async function listSppsByPaymentPhaseIds(
  client: Supabase,
  paymentPhaseIds: string[]
) {
  if (paymentPhaseIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_payment_phases")
    .select("id, payment_phase_id, status, student_id")
    .in("payment_phase_id", paymentPhaseIds);
}

/** Minimal columns for phase list active/paid counts (no student ids). */
export async function listSppStatusRowsByPaymentPhaseIds(
  client: Supabase,
  paymentPhaseIds: string[]
) {
  if (paymentPhaseIds.length === 0) {
    return {
      data: [] as Array<{
        payment_phase_id: string;
        status: string;
        total_paid: number;
      }>,
      error: null,
    };
  }

  return client
    .from("student_payment_phases")
    .select("payment_phase_id, status, total_paid")
    .in("payment_phase_id", paymentPhaseIds);
}

export async function listSppsByPaymentPhaseId(
  client: Supabase,
  paymentPhaseId: string
) {
  return client
    .from("student_payment_phases")
    .select(SPP_COLUMNS)
    .eq("payment_phase_id", paymentPhaseId)
    .order("created_at", { ascending: false });
}

export async function findSppByStudentAndPhase(
  client: Supabase,
  studentId: string,
  paymentPhaseId: string
) {
  return client
    .from("student_payment_phases")
    .select(SPP_COLUMNS)
    .eq("student_id", studentId)
    .eq("payment_phase_id", paymentPhaseId)
    .maybeSingle();
}

export async function listSppIdsByStudentId(client: Supabase, studentId: string) {
  return client
    .from("student_payment_phases")
    .select("id")
    .eq("student_id", studentId);
}

export async function findSppById(client: Supabase, id: string) {
  return client
    .from("student_payment_phases")
    .select(SPP_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

const SPP_WITH_PHASE_SELECT = `${SPP_COLUMNS}, payment_phases (id, name, semester_id, semester_code, amount, upfront_amount, duration_months, start_date, end_date, status, created_at, updated_at, semesters ( id, name, semester_code ))`;

export async function findSppWithPhaseById(client: Supabase, id: string) {
  return client
    .from("student_payment_phases")
    .select(SPP_WITH_PHASE_SELECT)
    .eq("id", id)
    .maybeSingle();
}

const SPP_WITH_OPEN_PHASE_SELECT = `${SPP_COLUMNS}, payment_phases!inner(id, name, semester_id, semester_code, amount, upfront_amount, duration_months, start_date, end_date, status, created_at, updated_at, semesters ( id, name, semester_code ))`;

/** Non-cancelled SPPs for a student on phases that are currently opened. */
export async function listOpenPhaseSppsByStudentId(
  client: Supabase,
  studentId: string
) {
  return client
    .from("student_payment_phases")
    .select(SPP_WITH_OPEN_PHASE_SELECT)
    .eq("student_id", studentId)
    .neq("status", "cancelled")
    .eq("payment_phases.status", "opened")
    .order("created_at", { foreignTable: "payment_phases", ascending: false });
}

export async function listSppsByIds(client: Supabase, ids: string[]) {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_payment_phases")
    .select("id, student_id, payment_phase_id, status")
    .in("id", ids);
}

export async function listSppsFullByIds(client: Supabase, ids: string[]) {
  if (ids.length === 0) {
    return { data: [] as StudentPaymentPhaseRecord[], error: null };
  }

  return client
    .from("student_payment_phases")
    .select(SPP_COLUMNS)
    .in("id", ids);
}

/** Active SPPs with remaining balance (for unpaid analytics). */
export async function listActiveUnpaidSpps(client: Supabase) {
  return client
    .from("student_payment_phases")
    .select(
      "id, student_id, payment_phase_id, status, remaining_amount, final_amount_due, total_paid, payment_phases!inner(status)"
    )
    .neq("status", "cancelled")
    .gt("remaining_amount", 0)
    .not("payment_phases.status", "in", "(cancelled,closed)")
    .order("created_at", { ascending: false });
}

export async function listAllSpps(client: Supabase) {
  return client
    .from("student_payment_phases")
    .select(SPP_COLUMNS)
    .order("created_at", { ascending: false });
}

export async function createStudentPaymentPhase(
  client: Supabase,
  input: CreateStudentPaymentPhaseRecordInput
) {
  return client
    .from("student_payment_phases")
    .insert({
      student_id: input.student_id,
      payment_phase_id: input.payment_phase_id,
      assigned_at: input.assigned_at,
      status: input.status,
      original_amount: input.original_amount,
      adjustment_amount: input.adjustment_amount,
      final_amount_due: input.final_amount_due,
      total_paid: input.total_paid,
      remaining_amount: input.remaining_amount,
    })
    .select(SPP_COLUMNS)
    .single();
}

export async function createStudentPaymentPhases(
  client: Supabase,
  inputs: CreateStudentPaymentPhaseRecordInput[]
) {
  if (inputs.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_payment_phases")
    .insert(
      inputs.map((input) => ({
        student_id: input.student_id,
        payment_phase_id: input.payment_phase_id,
        assigned_at: input.assigned_at,
        status: input.status,
        original_amount: input.original_amount,
        adjustment_amount: input.adjustment_amount,
        final_amount_due: input.final_amount_due,
        total_paid: input.total_paid,
        remaining_amount: input.remaining_amount,
      }))
    )
    .select(SPP_COLUMNS);
}

export type UpdateStudentPaymentPhaseFinancialsInput = {
  status: string;
  original_amount: number;
  adjustment_amount: number;
  final_amount_due: number;
  total_paid: number;
  remaining_amount: number;
};

export async function updateStudentPaymentPhaseFinancials(
  client: Supabase,
  id: string,
  input: UpdateStudentPaymentPhaseFinancialsInput
) {
  return client
    .from("student_payment_phases")
    .update({
      status: input.status,
      original_amount: input.original_amount,
      adjustment_amount: input.adjustment_amount,
      final_amount_due: input.final_amount_due,
      total_paid: input.total_paid,
      remaining_amount: input.remaining_amount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SPP_COLUMNS)
    .single();
}

export async function updateStudentPaymentPhaseStatus(
  client: Supabase,
  id: string,
  status: string
) {
  return client
    .from("student_payment_phases")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SPP_COLUMNS)
    .single();
}

export async function updateStudentPaymentPhasePaymentPhaseId(
  client: Supabase,
  id: string,
  paymentPhaseId: string
) {
  return client
    .from("student_payment_phases")
    .update({
      payment_phase_id: paymentPhaseId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(SPP_COLUMNS)
    .single();
}

export type StudentPaymentPhaseWithPhaseRecord = StudentPaymentPhaseRecord & {
  payment_phases: { id: string; name: string; status: string } | null;
};

export async function listSppsWithPhaseByStudentId(
  client: Supabase,
  studentId: string
) {
  return client
    .from("student_payment_phases")
    .select(
      `${SPP_COLUMNS}, payment_phases ( id, name, status )`
    )
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
}

export async function deleteStudentPaymentPhaseById(
  client: Supabase,
  id: string
) {
  return client
    .from("student_payment_phases")
    .delete()
    .eq("id", id)
    .select(SPP_COLUMNS)
    .maybeSingle();
}

export async function syncStudentJoinedClass(
  client: Supabase,
  studentId: string,
  classId: string
) {
  return client.rpc("sync_student_joined_class", {
    p_student_id: studentId,
    p_class_id: classId,
  });
}

export async function syncStudentsJoinedClass(
  client: Supabase,
  classId: string,
  studentIds: string[]
) {
  if (studentIds.length === 0) {
    return { data: [], error: null };
  }

  return client.rpc("sync_students_joined_class", {
    p_class_id: classId,
    p_student_ids: studentIds,
  });
}

export async function syncStudentLeftClass(
  client: Supabase,
  studentId: string,
  classId: string
) {
  return client.rpc("sync_student_left_class", {
    p_student_id: studentId,
    p_class_id: classId,
  });
}

export type EnsureSppRpcResult = {
  spp: StudentPaymentPhaseRecord | null;
  created: boolean;
  alreadyExisted: boolean;
  reactivated: boolean;
};

export type BackfillSppsRpcResult = {
  ensuredCount: number;
  createdCount: number;
  reactivatedCount: number;
  created: StudentPaymentPhaseRecord[];
  reactivated: StudentPaymentPhaseRecord[];
  semesterId: string | null;
};

export type RecalcSppAndPhaseStatusRpcResult = {
  spp: StudentPaymentPhaseRecord | null;
  phaseStatus: string;
};

export type RecalcNonCancelledSppsForPhaseRpcResult = {
  sppRecalculated: number;
  nextPhaseStatus: string;
};

function asSppRecord(value: unknown): StudentPaymentPhaseRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || typeof row.student_id !== "string") {
    return null;
  }

  const asNumber = (input: unknown) =>
    typeof input === "number" ? input : input == null ? 0 : Number(input);

  return {
    id: row.id,
    student_id: row.student_id,
    payment_phase_id:
      typeof row.payment_phase_id === "string" ? row.payment_phase_id : "",
    assigned_at: typeof row.assigned_at === "string" ? row.assigned_at : "",
    status: typeof row.status === "string" ? row.status : "",
    original_amount: asNumber(row.original_amount),
    adjustment_amount: asNumber(row.adjustment_amount),
    final_amount_due: asNumber(row.final_amount_due),
    total_paid: asNumber(row.total_paid),
    remaining_amount: asNumber(row.remaining_amount),
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

function parseEnsureSppRpcResult(data: unknown): EnsureSppRpcResult {
  if (!data || typeof data !== "object") {
    return {
      spp: null,
      created: false,
      alreadyExisted: false,
      reactivated: false,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    spp: asSppRecord(row.spp),
    created: row.created === true,
    alreadyExisted: row.alreadyExisted === true,
    reactivated: row.reactivated === true,
  };
}

function parseSppArray(value: unknown): StudentPaymentPhaseRecord[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => asSppRecord(item))
    .filter((item): item is StudentPaymentPhaseRecord => item !== null);
}

function parseBackfillSppsRpcResult(data: unknown): BackfillSppsRpcResult {
  if (!data || typeof data !== "object") {
    return {
      ensuredCount: 0,
      createdCount: 0,
      reactivatedCount: 0,
      created: [],
      reactivated: [],
      semesterId: null,
    };
  }

  const row = data as Record<string, unknown>;
  const asCount = (input: unknown) =>
    typeof input === "number" ? input : Number(input) || 0;

  const phase = row.phase as { semester_id?: unknown } | null;
  return {
    ensuredCount: asCount(row.ensuredCount),
    createdCount: asCount(row.createdCount),
    reactivatedCount: asCount(row.reactivatedCount),
    created: parseSppArray(row.created),
    reactivated: parseSppArray(row.reactivated),
    semesterId:
      phase && typeof phase.semester_id === "string" ? phase.semester_id : null,
  };
}

export async function ensureSppForStudentOnPhase(
  client: Supabase,
  studentId: string,
  phaseId: string,
  assignedAt?: string
) {
  const { data, error } = await client.rpc("ensure_spp_for_student_on_phase", {
    p_student_id: studentId,
    p_phase_id: phaseId,
    ...(assignedAt ? { p_assigned_at: assignedAt.slice(0, 10) } : {}),
  });

  if (error) {
    return { data: null, error };
  }

  return { data: parseEnsureSppRpcResult(data), error: null };
}

export async function backfillSppsForClassBecomeInProgress(
  client: Supabase,
  classId: string
) {
  const { data, error } = await client.rpc(
    "backfill_spps_for_class_become_in_progress",
    { p_class_id: classId }
  );

  if (error) {
    return { data: null, error };
  }

  return { data: parseBackfillSppsRpcResult(data), error: null };
}

export async function recalcSppAndPhaseStatus(client: Supabase, sppId: string) {
  const { data, error } = await client.rpc("recalc_spp_and_phase_status", {
    p_spp_id: sppId,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: { spp: null, phaseStatus: "" } satisfies RecalcSppAndPhaseStatusRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      spp: asSppRecord(row.spp),
      phaseStatus: typeof row.phaseStatus === "string" ? row.phaseStatus : "",
    } satisfies RecalcSppAndPhaseStatusRpcResult,
    error: null,
  };
}

export async function recalcNonCancelledSppsForPhase(
  client: Supabase,
  phaseId: string
) {
  const { data, error } = await client.rpc(
    "recalc_non_cancelled_spps_for_phase",
    { p_phase_id: phaseId }
  );

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        sppRecalculated: 0,
        nextPhaseStatus: "",
      } satisfies RecalcNonCancelledSppsForPhaseRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      sppRecalculated:
        typeof row.sppRecalculated === "number"
          ? row.sppRecalculated
          : Number(row.sppRecalculated) || 0,
      nextPhaseStatus:
        typeof row.nextPhaseStatus === "string" ? row.nextPhaseStatus : "",
    } satisfies RecalcNonCancelledSppsForPhaseRpcResult,
    error: null,
  };
}

export type DeleteSppRpcResult = {
  deleted: StudentPaymentPhaseRecord | null;
  paymentPhaseId: string;
};

export type RepairMissingSppRpcResult = {
  alreadyExisted: boolean;
  created: boolean;
  reactivated: boolean;
  phaseReopened: boolean;
  spp: StudentPaymentPhaseRecord | null;
};

export type TransferSppRpcResult = {
  sppId: string;
  studentId: string;
  fromPaymentPhaseId: string;
  toPaymentPhaseId: string;
};

export async function deleteStudentPaymentPhaseWithRecalc(
  client: Supabase,
  sppId: string
) {
  const { data, error } = await client.rpc("delete_student_payment_phase", {
    p_id: sppId,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: { deleted: null, paymentPhaseId: "" } satisfies DeleteSppRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      deleted: asSppRecord(row.deleted),
      paymentPhaseId:
        typeof row.paymentPhaseId === "string" ? row.paymentPhaseId : "",
    } satisfies DeleteSppRpcResult,
    error: null,
  };
}

export async function repairMissingSpp(
  client: Supabase,
  paymentPhaseId: string,
  studentId: string
) {
  const { data, error } = await client.rpc("repair_missing_spp", {
    p_payment_phase_id: paymentPhaseId,
    p_student_id: studentId,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        alreadyExisted: false,
        created: false,
        reactivated: false,
        phaseReopened: false,
        spp: null,
      } satisfies RepairMissingSppRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      alreadyExisted: row.alreadyExisted === true,
      created: row.created === true,
      reactivated: row.reactivated === true,
      phaseReopened: row.phaseReopened === true,
      spp: asSppRecord(row.spp),
    } satisfies RepairMissingSppRpcResult,
    error: null,
  };
}

export async function transferStudentPaymentPhase(
  client: Supabase,
  sppId: string,
  destinationPaymentPhaseId: string
) {
  const { data, error } = await client.rpc("transfer_student_payment_phase", {
    p_spp_id: sppId,
    p_destination_payment_phase_id: destinationPaymentPhaseId,
  });

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        sppId: "",
        studentId: "",
        fromPaymentPhaseId: "",
        toPaymentPhaseId: "",
      } satisfies TransferSppRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      sppId: typeof row.sppId === "string" ? row.sppId : "",
      studentId: typeof row.studentId === "string" ? row.studentId : "",
      fromPaymentPhaseId:
        typeof row.fromPaymentPhaseId === "string"
          ? row.fromPaymentPhaseId
          : "",
      toPaymentPhaseId:
        typeof row.toPaymentPhaseId === "string" ? row.toPaymentPhaseId : "",
    } satisfies TransferSppRpcResult,
    error: null,
  };
}
