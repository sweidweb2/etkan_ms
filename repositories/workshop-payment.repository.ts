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

/** Totals without loading full payment rows (amount/type/workshop_id only). */
export async function aggregateWorkshopPaymentsTotals(
  client: Supabase,
  creditType: string,
  debitType: string
) {
  const [creditsResult, debitsResult, countResult, workshopIdsResult] =
    await Promise.all([
      client
        .from("workshop_payments")
        .select("amount")
        .eq("type", creditType),
      client
        .from("workshop_payments")
        .select("amount")
        .eq("type", debitType),
      client
        .from("workshop_payments")
        .select("id", { count: "exact", head: true }),
      client.from("workshop_payments").select("workshop_id"),
    ]);

  if (creditsResult.error) {
    return { data: null, error: creditsResult.error };
  }
  if (debitsResult.error) {
    return { data: null, error: debitsResult.error };
  }
  if (countResult.error) {
    return { data: null, error: countResult.error };
  }
  if (workshopIdsResult.error) {
    return { data: null, error: workshopIdsResult.error };
  }

  const credits = (creditsResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0
  );
  const debits = (debitsResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.amount ?? 0),
    0
  );
  const workshopIds = new Set(
    (workshopIdsResult.data ?? [])
      .map((row) => row.workshop_id)
      .filter(Boolean)
  );

  return {
    data: {
      credits,
      debits,
      net: credits - debits,
      payment_count: countResult.count ?? 0,
      workshops_with_payments: workshopIds.size,
    },
    error: null,
  };
}

/** Net paid per workshop without loading full payment rows. */
export async function listWorkshopPaymentAmounts(
  client: Supabase,
  workshopIds?: string[]
) {
  const query = client.from("workshop_payments").select("workshop_id, amount, type");

  if (workshopIds) {
    return query.in("workshop_id", workshopIds);
  }

  return query;
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
