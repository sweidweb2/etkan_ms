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
    .select("effective_date, value")
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
