import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const WORKSHOP_PAYMENT_COLUMNS =
  "id, workshop_id, amount, type, payment_date, payment_method, notes, created_by, created_at, transaction_id";

export type WorkshopPaymentRecord = {
  id: string;
  workshop_id: string;
  amount: number;
  type: string;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  transaction_id: string | null;
};

export type CreateWorkshopPaymentRecordInput = {
  workshop_id: string;
  amount: number;
  type: string;
  payment_date: string;
  payment_method?: string | null;
  notes?: string | null;
  created_by?: string | null;
  transaction_id?: string | null;
};

export type UpdateWorkshopPaymentRecordInput = {
  amount: number;
  type: string;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
};

export async function listWorkshopPaymentsByWorkshopId(
  client: Supabase,
  workshopId: string
) {
  return client
    .from("workshop_payments")
    .select(WORKSHOP_PAYMENT_COLUMNS)
    .eq("workshop_id", workshopId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });
}

export type WorkshopPaymentWithWorkshopRecord = WorkshopPaymentRecord & {
  workshops: { name: string } | null;
};

export async function listAllWorkshopPayments(client: Supabase) {
  return client
    .from("workshop_payments")
    .select(`${WORKSHOP_PAYMENT_COLUMNS}, workshops(name)`)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function listWorkshopPaymentsPage(
  client: Supabase,
  input: { offset: number; limit: number }
) {
  return client
    .from("workshop_payments")
    .select(`${WORKSHOP_PAYMENT_COLUMNS}, workshops(name)`, { count: "exact" })
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(input.offset, input.offset + input.limit - 1);
}

export type WorkshopPaymentTotals = {
  credits: number;
  debits: number;
  net: number;
  payment_count: number;
  workshops_with_payments: number;
};

/** All-time overview totals via DB aggregate (avoids PostgREST max_rows). */
export async function aggregateWorkshopPaymentsTotals(client: Supabase) {
  const { data, error } = await client.rpc("aggregate_workshop_payment_totals");

  if (error) {
    return { data: null as WorkshopPaymentTotals | null, error };
  }

  const row =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const credits = Math.max(0, Number(row.credits) || 0);
  const debits = Math.max(0, Number(row.debits) || 0);

  return {
    data: {
      credits,
      debits,
      net: credits - debits,
      payment_count: Math.max(0, Number(row.payment_count) || 0),
      workshops_with_payments: Math.max(
        0,
        Number(row.workshops_with_payments) || 0
      ),
    } satisfies WorkshopPaymentTotals,
    error: null,
  };
}

export type WorkshopPaymentNet = {
  workshop_id: string;
  paid_net: number;
};

/** Signed paid-net (credits minus debits) for the given workshops. */
export async function sumWorkshopPaymentNetsByWorkshopIds(
  client: Supabase,
  workshopIds: string[]
) {
  if (workshopIds.length === 0) {
    return { data: [] as WorkshopPaymentNet[], error: null };
  }

  const { data, error } = await client.rpc("sum_workshop_payment_nets", {
    p_workshop_ids: workshopIds,
  });

  if (error) {
    return { data: null as WorkshopPaymentNet[] | null, error };
  }

  const nets: WorkshopPaymentNet[] = [];
  for (const row of data ?? []) {
    if (!row.workshop_id) {
      continue;
    }
    nets.push({
      workshop_id: row.workshop_id,
      paid_net: Number(row.paid_net) || 0,
    });
  }

  return { data: nets, error: null };
}

export async function findWorkshopPaymentById(client: Supabase, id: string) {
  return client
    .from("workshop_payments")
    .select(WORKSHOP_PAYMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findWorkshopPaymentByTransactionId(
  client: Supabase,
  transactionId: string
) {
  return client
    .from("workshop_payments")
    .select(WORKSHOP_PAYMENT_COLUMNS)
    .eq("transaction_id", transactionId)
    .maybeSingle();
}

/** Map transaction_id → workshop_payment id for income-statement linking. */
export async function listWorkshopPaymentLinksByTransactionIds(
  client: Supabase,
  transactionIds: string[]
) {
  if (transactionIds.length === 0) {
    return { data: [] as { id: string; transaction_id: string }[], error: null };
  }

  return client
    .from("workshop_payments")
    .select("id, transaction_id")
    .in("transaction_id", transactionIds);
}

export async function createWorkshopPayment(
  client: Supabase,
  input: CreateWorkshopPaymentRecordInput
) {
  return client
    .from("workshop_payments")
    .insert({
      workshop_id: input.workshop_id,
      amount: input.amount,
      type: input.type,
      payment_date: input.payment_date,
      payment_method: input.payment_method ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by ?? null,
      transaction_id: input.transaction_id ?? null,
    })
    .select(WORKSHOP_PAYMENT_COLUMNS)
    .single();
}

export async function updateWorkshopPaymentById(
  client: Supabase,
  id: string,
  input: UpdateWorkshopPaymentRecordInput
) {
  return client
    .from("workshop_payments")
    .update({
      amount: input.amount,
      type: input.type,
      payment_date: input.payment_date,
      payment_method: input.payment_method,
      notes: input.notes,
    })
    .eq("id", id)
    .select(WORKSHOP_PAYMENT_COLUMNS)
    .single();
}

export async function updateWorkshopPaymentTransactionId(
  client: Supabase,
  id: string,
  transactionId: string | null
) {
  return client
    .from("workshop_payments")
    .update({ transaction_id: transactionId })
    .eq("id", id)
    .select(WORKSHOP_PAYMENT_COLUMNS)
    .single();
}

export async function deleteWorkshopPaymentById(client: Supabase, id: string) {
  return client.from("workshop_payments").delete().eq("id", id);
}
