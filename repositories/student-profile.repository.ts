import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function findStudentProfileByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("student_profiles")
    .select("id, user_id, full_name, birth_date, phone, status, created_at")
    .eq("user_id", userId)
    .maybeSingle();
}

export async function createStudentProfile(
  client: Supabase,
  input: {
    user_id: string;
    full_name: string;
    birth_date?: string | null;
    phone?: string | null;
    status?: string;
  }
) {
  return client
    .from("student_profiles")
    .insert({
      user_id: input.user_id,
      full_name: input.full_name,
      birth_date: input.birth_date ?? null,
      phone: input.phone ?? null,
      status: input.status ?? "active",
    })
    .select("id, user_id")
    .single();
}
