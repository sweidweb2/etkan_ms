import type { RoleValue } from "@/lib/constants/roles";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function findProfileById(client: Supabase, id: string) {
  return client
    .from("profiles")
    .select("id, username, role, created_at")
    .eq("id", id)
    .maybeSingle();
}

export async function findProfileByUsername(client: Supabase, username: string) {
  return client
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();
}

export async function findRoleById(client: Supabase, id: string) {
  return client.from("profiles").select("role").eq("id", id).maybeSingle();
}

export async function createProfile(
  client: Supabase,
  input: {
    id: string;
    username: string;
    role: RoleValue;
  }
) {
  return client
    .from("profiles")
    .insert({
      id: input.id,
      username: input.username,
      role: input.role,
    })
    .select("id, role")
    .single();
}

export async function deleteProfileById(client: Supabase, id: string) {
  return client.from("profiles").delete().eq("id", id);
}
