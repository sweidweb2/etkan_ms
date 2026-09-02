import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const ADJUSTMENT_COLUMNS =
  "id, student_payment_phase_id, type, value_type, value, reason, effective_date, created_at, updated_at";

export type FinancialAdjustmentRecord = {
  id: string;
  student_payment_phase_id: string;
  type: string;
  value_type: string;
  value: number;
  reason: string | null;
  effective_date: string;
  created_at: string;
  updated_at: string;
};

export type CreateFinancialAdjustmentRecordInput = {
  student_payment_phase_id: string;
  type: string;
  value_type: string;
  value: number;
  reason: string | null;
  effective_date: string;
};

export type UpdateFinancialAdjustmentRecordInput = {
  type: string;
  value_type: string;
  value: number;
  reason: string | null;
  effective_date: string;
};

export async function listAdjustmentsBySppIds(
  client: Supabase,
  sppIds: string[]
) {
  if (sppIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_financial_adjustments")
    .select("student_payment_phase_id, value_type, value")
    .in("student_payment_phase_id", sppIds);
}

export async function listAdjustmentIdsBySppIds(
  client: Supabase,
  sppIds: string[]
) {
  if (sppIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_financial_adjustments")
    .select("id")
    .in("student_payment_phase_id", sppIds);
}

export async function listAllFinancialAdjustments(client: Supabase) {
  return client
    .from("student_financial_adjustments")
    .select(ADJUSTMENT_COLUMNS)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false });
}

/** Dates only — used to discover months that have adjustment activity. */
export async function listAllFinancialAdjustmentDates(client: Supabase) {
  return client
    .from("student_financial_adjustments")
    .select("effective_date");
}

/** Inclusive `from`, exclusive `to` on `effective_date` (ISO date strings). */
export async function listFinancialAdjustmentsBetween(
  client: Supabase,
  fromInclusive: string,
  toExclusive: string
) {
  return client
    .from("student_financial_adjustments")
    .select(ADJUSTMENT_COLUMNS)
    .gte("effective_date", fromInclusive)
    .lt("effective_date", toExclusive)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false });
}

/** Slim rows for analytics chart totals. */
export async function listFinancialAdjustmentAmountsBetween(
  client: Supabase,
  fromInclusive: string,
  toExclusive: string
) {
  return client
    .from("student_financial_adjustments")
    .select("effective_date, value, value_type, student_payment_phase_id")
    .gte("effective_date", fromInclusive)
    .lt("effective_date", toExclusive);
}

export async function findFinancialAdjustmentDateBounds(client: Supabase) {
  const aggregate = await client
    .from("student_financial_adjustments")
    .select("min_date:effective_date.min(), max_date:effective_date.max()")
    .maybeSingle();

  if (!aggregate.error && aggregate.data) {
    const row = aggregate.data as unknown as {
      min_date?: string | null;
      max_date?: string | null;
    };
    return {
      data: {
        min: row.min_date ?? null,
        max: row.max_date ?? null,
      },
      error: null,
    };
  }

  const [minResult, maxResult] = await Promise.all([
    client
      .from("student_financial_adjustments")
      .select("effective_date")
      .order("effective_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    client
      .from("student_financial_adjustments")
      .select("effective_date")
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (minResult.error) {
    return { data: null, error: minResult.error };
  }
  if (maxResult.error) {
    return { data: null, error: maxResult.error };
  }

  return {
    data: {
      min: minResult.data?.effective_date ?? null,
      max: maxResult.data?.effective_date ?? null,
    },
    error: null,
  };
}

export async function findAdjustmentBySppId(client: Supabase, sppId: string) {
  return client
    .from("student_financial_adjustments")
    .select(ADJUSTMENT_COLUMNS)
    .eq("student_payment_phase_id", sppId)
    .maybeSingle();
}

export async function findAdjustmentById(client: Supabase, id: string) {
  return client
    .from("student_financial_adjustments")
    .select(ADJUSTMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export type AdjustmentWithSourceSppRecord = FinancialAdjustmentRecord & {
  student_payment_phases: {
    id: string;
    student_id: string;
    status: string;
    payment_phases: { id: string; name: string; status: string } | null;
  } | null;
};

/**
 * Adjustments on other SPPs for the same student (import picker source list).
 */
export async function listAdjustmentsForStudentExcludingSpp(
  client: Supabase,
  studentId: string,
  excludeSppId: string
) {
  return client
    .from("student_financial_adjustments")
    .select(
      `${ADJUSTMENT_COLUMNS}, student_payment_phases!inner ( id, student_id, status, payment_phases ( id, name, status ) )`
    )
    .eq("student_payment_phases.student_id", studentId)
    .neq("student_payment_phase_id", excludeSppId)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false });
}

/**
 * Distinct student ids that have at least one adjustment on an SPP outside
 * `excludeSppIds` (used for the missing-prior-adjustment queue).
 */
export async function listStudentIdsWithAdjustmentsExcludingSppIds(
  client: Supabase,
  studentIds: string[],
  excludeSppIds: string[]
) {
  if (studentIds.length === 0) {
    return { data: [] as string[], error: null };
  }

  let query = client
    .from("student_financial_adjustments")
    .select("student_payment_phases!inner ( student_id )")
    .in("student_payment_phases.student_id", studentIds);

  if (excludeSppIds.length > 0) {
    query = query.not(
      "student_payment_phase_id",
      "in",
      `(${excludeSppIds.join(",")})`
    );
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error };
  }

  const ids = new Set<string>();
  for (const row of data ?? []) {
    const spp = (
      row as {
        student_payment_phases?:
          | { student_id?: string }
          | { student_id?: string }[]
          | null;
      }
    ).student_payment_phases;
    if (!spp || Array.isArray(spp)) {
      continue;
    }
    if (typeof spp.student_id === "string") {
      ids.add(spp.student_id);
    }
  }

  return { data: [...ids], error: null };
}

export async function createAdjustment(
  client: Supabase,
  input: CreateFinancialAdjustmentRecordInput
) {
  return client
    .from("student_financial_adjustments")
    .insert({
      student_payment_phase_id: input.student_payment_phase_id,
      type: input.type,
      value_type: input.value_type,
      value: input.value,
      reason: input.reason,
      effective_date: input.effective_date,
    })
    .select(ADJUSTMENT_COLUMNS)
    .single();
}

export async function updateAdjustment(
  client: Supabase,
  id: string,
  input: UpdateFinancialAdjustmentRecordInput
) {
  return client
    .from("student_financial_adjustments")
    .update({
      type: input.type,
      value_type: input.value_type,
      value: input.value,
      reason: input.reason,
      effective_date: input.effective_date,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ADJUSTMENT_COLUMNS)
    .single();
}

export async function deleteAdjustment(client: Supabase, id: string) {
  return client.from("student_financial_adjustments").delete().eq("id", id);
}

export type AdjustmentWriteRpcResult = {
  adjustment: FinancialAdjustmentRecord | null;
  previous: FinancialAdjustmentRecord | null;
  studentPaymentPhaseId: string;
  paymentPhaseId: string;
};

export type DeleteAdjustmentRpcResult = {
  deleted: FinancialAdjustmentRecord | null;
  studentPaymentPhaseId: string;
  paymentPhaseId: string;
};

function asNumber(input: unknown) {
  return typeof input === "number" ? input : input == null ? 0 : Number(input);
}

function asAdjustmentRecord(value: unknown): FinancialAdjustmentRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string") {
    return null;
  }

  return {
    id: row.id,
    student_payment_phase_id:
      typeof row.student_payment_phase_id === "string"
        ? row.student_payment_phase_id
        : "",
    type: typeof row.type === "string" ? row.type : "",
    value_type: typeof row.value_type === "string" ? row.value_type : "",
    value: asNumber(row.value),
    reason: typeof row.reason === "string" ? row.reason : null,
    effective_date:
      typeof row.effective_date === "string" ? row.effective_date : "",
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
  };
}

export async function createAdjustmentWithRecalc(
  client: Supabase,
  input: CreateFinancialAdjustmentRecordInput
) {
  const { data, error } = await client.rpc(
    "create_student_financial_adjustment",
    {
      p_student_payment_phase_id: input.student_payment_phase_id,
      p_type: input.type,
      p_value_type: input.value_type,
      p_value: input.value,
      p_reason: input.reason,
      p_effective_date: input.effective_date,
    }
  );

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        adjustment: null,
        previous: null,
        studentPaymentPhaseId: "",
        paymentPhaseId: "",
      } satisfies AdjustmentWriteRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      adjustment: asAdjustmentRecord(row.adjustment),
      previous: null,
      studentPaymentPhaseId:
        typeof row.studentPaymentPhaseId === "string"
          ? row.studentPaymentPhaseId
          : "",
      paymentPhaseId:
        typeof row.paymentPhaseId === "string" ? row.paymentPhaseId : "",
    } satisfies AdjustmentWriteRpcResult,
    error: null,
  };
}

export async function updateAdjustmentWithRecalc(
  client: Supabase,
  input: UpdateFinancialAdjustmentRecordInput & {
    id: string;
    student_payment_phase_id: string;
  }
) {
  const { data, error } = await client.rpc(
    "update_student_financial_adjustment",
    {
      p_id: input.id,
      p_student_payment_phase_id: input.student_payment_phase_id,
      p_type: input.type,
      p_value_type: input.value_type,
      p_value: input.value,
      p_reason: input.reason,
      p_effective_date: input.effective_date,
    }
  );

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        adjustment: null,
        previous: null,
        studentPaymentPhaseId: "",
        paymentPhaseId: "",
      } satisfies AdjustmentWriteRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      adjustment: asAdjustmentRecord(row.adjustment),
      previous: asAdjustmentRecord(row.previous),
      studentPaymentPhaseId:
        typeof row.studentPaymentPhaseId === "string"
          ? row.studentPaymentPhaseId
          : "",
      paymentPhaseId:
        typeof row.paymentPhaseId === "string" ? row.paymentPhaseId : "",
    } satisfies AdjustmentWriteRpcResult,
    error: null,
  };
}

export async function deleteAdjustmentWithRecalc(
  client: Supabase,
  id: string,
  studentPaymentPhaseId?: string
) {
  const { data, error } = await client.rpc(
    "delete_student_financial_adjustment",
    {
      p_id: id,
      ...(studentPaymentPhaseId
        ? { p_student_payment_phase_id: studentPaymentPhaseId }
        : {}),
    }
  );

  if (error) {
    return { data: null, error };
  }

  if (!data || typeof data !== "object") {
    return {
      data: {
        deleted: null,
        studentPaymentPhaseId: "",
        paymentPhaseId: "",
      } satisfies DeleteAdjustmentRpcResult,
      error: null,
    };
  }

  const row = data as Record<string, unknown>;
  return {
    data: {
      deleted: asAdjustmentRecord(row.deleted),
      studentPaymentPhaseId:
        typeof row.studentPaymentPhaseId === "string"
          ? row.studentPaymentPhaseId
          : "",
      paymentPhaseId:
        typeof row.paymentPhaseId === "string" ? row.paymentPhaseId : "",
    } satisfies DeleteAdjustmentRpcResult,
    error: null,
  };
}
