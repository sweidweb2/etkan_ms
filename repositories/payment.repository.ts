import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const PAYMENT_COLUMNS =
  "id, subscribed_semester_id, amount, currency, method, paid_at";

export type PaymentRecord = {
  id: string;
  subscribed_semester_id: string;
  amount: number;
  currency: string | null;
  method: string | null;
  paid_at: string | null;
};

export type CreatePaymentInput = {
  subscribed_semester_id: string;
  amount: number;
  currency: string;
  method: string;
  paid_at: string;
};

export type UpdatePaymentInput = CreatePaymentInput;

export async function listPaymentsBySubscribedSemesterId(
  client: Supabase,
  subscribedSemesterId: string
) {
  return client
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("subscribed_semester_id", subscribedSemesterId)
    .order("paid_at", { ascending: false });
}

export async function listPaymentsBySubscribedSemesterIds(
  client: Supabase,
  subscribedSemesterIds: string[]
) {
  if (subscribedSemesterIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .in("subscribed_semester_id", subscribedSemesterIds)
    .order("paid_at", { ascending: false });
}

export async function findPaymentById(client: Supabase, id: string) {
  return client
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createPayment(client: Supabase, input: CreatePaymentInput) {
  return client
    .from("payments")
    .insert({
      subscribed_semester_id: input.subscribed_semester_id,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      paid_at: input.paid_at,
    })
    .select(PAYMENT_COLUMNS)
    .single();
}

export async function updatePayment(
  client: Supabase,
  id: string,
  input: UpdatePaymentInput
) {
  return client
    .from("payments")
    .update({
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      paid_at: input.paid_at,
    })
    .eq("id", id)
    .select(PAYMENT_COLUMNS)
    .single();
}

export async function deletePayment(client: Supabase, id: string) {
  return client.from("payments").delete().eq("id", id).select(PAYMENT_COLUMNS).single();
}
