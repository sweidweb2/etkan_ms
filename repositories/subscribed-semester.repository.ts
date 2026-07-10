import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SUBSCRIBED_SEMESTER_COLUMNS =
  "id, account_id, semester_id, amount, status, created_at";

export type SubscribedSemesterRecord = {
  id: string;
  account_id: string;
  semester_id: string | null;
  amount: number;
  status: string | null;
  created_at: string | null;
};

export type CreateSubscribedSemesterInput = {
  account_id: string;
  semester_id: string;
  amount: number;
  status?: string;
};

export type UpdateSubscribedSemesterInput = {
  amount: number;
  status: string;
};

export async function listSubscribedSemestersByAccountId(
  client: Supabase,
  accountId: string
) {
  return client
    .from("subscribed_semesters")
    .select(SUBSCRIBED_SEMESTER_COLUMNS)
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });
}

export async function listSubscribedSemestersByAccountIds(
  client: Supabase,
  accountIds: string[]
) {
  if (accountIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("subscribed_semesters")
    .select(SUBSCRIBED_SEMESTER_COLUMNS)
    .in("account_id", accountIds)
    .order("created_at", { ascending: false });
}

export async function findSubscribedSemesterById(client: Supabase, id: string) {
  return client
    .from("subscribed_semesters")
    .select(SUBSCRIBED_SEMESTER_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function createSubscribedSemester(
  client: Supabase,
  input: CreateSubscribedSemesterInput
) {
  return client
    .from("subscribed_semesters")
    .insert({
      account_id: input.account_id,
      semester_id: input.semester_id,
      amount: input.amount,
      status: input.status ?? "active",
    })
    .select(SUBSCRIBED_SEMESTER_COLUMNS)
    .single();
}

export async function updateSubscribedSemester(
  client: Supabase,
  id: string,
  input: UpdateSubscribedSemesterInput
) {
  return client
    .from("subscribed_semesters")
    .update({
      amount: input.amount,
      status: input.status,
    })
    .eq("id", id)
    .select(SUBSCRIBED_SEMESTER_COLUMNS)
    .single();
}
