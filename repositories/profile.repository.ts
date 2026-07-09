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

export async function updateProfileById(
  client: Supabase,
  id: string,
  input: {
    username: string;
  }
) {
  return client
    .from("profiles")
    .update({ username: input.username })
    .eq("id", id)
    .select("id, username, role, created_at")
    .single();
}

export type ListProfilesOptions = {
  roles?: RoleValue[];
  search?: string;
};

export async function listProfiles(
  client: Supabase,
  options?: ListProfilesOptions
) {
  let query = client
    .from("profiles")
    .select("id, username, role, created_at")
    .order("created_at", { ascending: false });

  if (options?.roles?.length) {
    query = query.in("role", options.roles);
  }

  const search = options?.search?.trim();
  if (search) {
    query = query.ilike("username", `%${search}%`);
  }

  return query;
}

export async function countProfiles(
  client: Supabase,
  options?: Pick<ListProfilesOptions, "roles">
) {
  let query = client
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (options?.roles?.length) {
    query = query.in("role", options.roles);
  }

  return query;
}
