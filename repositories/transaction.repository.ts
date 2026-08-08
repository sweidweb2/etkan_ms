import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const TRANSACTION_COLUMNS =
  "id, transaction_date, type, amount, description, category, payment_method, recorded_by, notes, created_at, updated_at";

export type TransactionRecord = {
  id: string;
  transaction_date: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  payment_method: string | null;
  recorded_by: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateTransactionRecordInput = {
  transaction_date: string;
  type: string;
  amount: number;
  description: string;
  category: string;
  payment_method: string | null;
  recorded_by: string;
  notes: string | null;
};

export async function listAllTransactions(client: Supabase) {
  return client
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });
}

/** Inclusive `from`, exclusive `to` on `transaction_date` (ISO date strings). */
export async function listTransactionsBetween(
  client: Supabase,
  fromInclusive: string,
  toExclusive: string
) {
  return client
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .gte("transaction_date", fromInclusive)
    .lt("transaction_date", toExclusive)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });
}

export async function findTransactionDateBounds(client: Supabase) {
  const [minResult, maxResult] = await Promise.all([
    client
      .from("transactions")
      .select("transaction_date")
      .order("transaction_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    client
      .from("transactions")
      .select("transaction_date")
      .order("transaction_date", { ascending: false })
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
      min: minResult.data?.transaction_date ?? null,
      max: maxResult.data?.transaction_date ?? null,
    },
    error: null,
  };
}

export async function createTransaction(
  client: Supabase,
  input: CreateTransactionRecordInput
) {
  return client
    .from("transactions")
    .insert({
      transaction_date: input.transaction_date,
      type: input.type,
      amount: input.amount,
      description: input.description,
      category: input.category,
      payment_method: input.payment_method,
      recorded_by: input.recorded_by,
      notes: input.notes,
    })
    .select(TRANSACTION_COLUMNS)
    .single();
}

export async function findTransactionById(client: Supabase, id: string) {
  return client
    .from("transactions")
    .select(TRANSACTION_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function updateTransaction(
  client: Supabase,
  id: string,
  input: CreateTransactionRecordInput
) {
  return client
    .from("transactions")
    .update({
      transaction_date: input.transaction_date,
      type: input.type,
      amount: input.amount,
      description: input.description,
      category: input.category,
      payment_method: input.payment_method,
      recorded_by: input.recorded_by,
      notes: input.notes,
    })
    .eq("id", id)
    .select(TRANSACTION_COLUMNS)
    .single();
}
