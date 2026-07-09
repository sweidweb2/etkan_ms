import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function findAccountByUserId(client: Supabase, userId: string) {
  return client
    .from("accounts")
    .select("id, user_id, opened_at")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function createAccount(
  client: Supabase,
  input: {
    user_id: string;
  }
) {
  return client
    .from("accounts")
    .insert({
      user_id: input.user_id,
    })
    .select("id, user_id")
    .single();
}
