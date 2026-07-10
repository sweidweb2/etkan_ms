import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function findScheduledPaymentsBySubscribedSemesterId(
  client: Supabase,
  subscribedSemesterId: string
) {
  return client
    .from("scheduled_payments")
    .select(
      "id, subscribed_semester_id, payment_date, amount, status, note, created_at, updated_at"
    )
    .eq("subscribed_semester_id", subscribedSemesterId)
    .order("payment_date", { ascending: true });
}

export async function createScheduledPayment(
  client: Supabase,
  input: {
    subscribed_semester_id: string;
    payment_date: string;
    amount?: number | null;
    status?: string;
    note?: string | null;
  }
) {
  return client
    .from("scheduled_payments")
    .insert({
      subscribed_semester_id: input.subscribed_semester_id,
      payment_date: input.payment_date,
      amount: input.amount ?? null,
      status: input.status ?? "scheduled",
      note: input.note ?? null,
    })
    .select(
      "id, subscribed_semester_id, payment_date, amount, status, note, created_at, updated_at"
    )
    .single();
}

export async function listScheduledPaymentsBySubscribedSemesterIds(
  client: Supabase,
  subscribedSemesterIds: string[]
) {
  if (subscribedSemesterIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("scheduled_payments")
    .select(
      "id, subscribed_semester_id, payment_date, amount, status, note, created_at, updated_at"
    )
    .in("subscribed_semester_id", subscribedSemesterIds)
    .order("payment_date", { ascending: true });
}

export async function findScheduledPaymentById(client: Supabase, id: string) {
  return client
    .from("scheduled_payments")
    .select(
      "id, subscribed_semester_id, payment_date, amount, status, note, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();
}

export async function updateScheduledPayment(
  client: Supabase,
  id: string,
  input: {
    payment_date: string;
    amount?: number | null;
    status: string;
    note?: string | null;
  }
) {
  return client
    .from("scheduled_payments")
    .update({
      payment_date: input.payment_date,
      amount: input.amount ?? null,
      status: input.status,
      note: input.note ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, subscribed_semester_id, payment_date, amount, status, note, created_at, updated_at"
    )
    .single();
}
