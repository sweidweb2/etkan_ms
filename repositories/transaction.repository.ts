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
