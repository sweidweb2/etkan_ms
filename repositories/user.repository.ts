import type { RoleValue } from "@/lib/constants/roles";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function findUserByEmail(client: Supabase, email: string) {
  return client
    .from("users")
    .select("id, email, username, auth_id")
    .eq("email", email)
    .maybeSingle();
}

export async function findUserByUsername(client: Supabase, username: string) {
  return client
    .from("users")
    .select("id, username")
    .eq("username", username)
    .maybeSingle();
}

export async function findUserByAuthId(client: Supabase, authId: string) {
  return client
    .from("users")
    .select("id, email, username, auth_id, role, created_at")
    .eq("auth_id", authId)
    .maybeSingle();
}

export async function findUserById(client: Supabase, userId: number) {
  return client
    .from("users")
    .select("id, email, username, role, created_at")
    .eq("id", userId)
    .maybeSingle();
}

export async function findRoleByAuthId(client: Supabase, authId: string) {
  return client
    .from("users")
    .select("role")
    .eq("auth_id", authId)
    .maybeSingle();
}

export async function createUser(
  client: Supabase,
  input: {
    auth_id: string;
    username: string;
    email: string;
    password_hash: string;
    role: RoleValue;
  }
) {
  return client
    .from("users")
    .insert({
      auth_id: input.auth_id,
      username: input.username,
      email: input.email,
      password_hash: input.password_hash,
      role: input.role,
    })
    .select("id, role")
    .single();
}

export async function deleteUserByAuthId(client: Supabase, authId: string) {
  return client.from("users").delete().eq("auth_id", authId);
}
