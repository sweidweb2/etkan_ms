import "server-only";

import type { RoleValue } from "@/lib/constants/roles";
import { chunkedIn } from "@/repositories/_shared/chunked-in";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const PROFILE_COLUMNS =
  "id, username, role, is_instructor, is_mentor, created_at";

const PROFILE_OPTION_COLUMNS = "id, username";

export async function findProfileById(client: Supabase, id: string) {
  return client
    .from("profiles")
    .select(PROFILE_COLUMNS)
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
    is_instructor?: boolean;
    is_mentor?: boolean;
  }
) {
  return client
    .from("profiles")
    .insert({
      id: input.id,
      username: input.username,
      role: input.role,
      is_instructor: input.is_instructor ?? false,
      is_mentor: input.is_mentor ?? false,
    })
    .select("id, role, is_instructor, is_mentor")
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
    role?: RoleValue;
    is_instructor?: boolean;
    is_mentor?: boolean;
  }
) {
  return client
    .from("profiles")
    .update({
      username: input.username,
      ...(input.role ? { role: input.role } : {}),
      ...(typeof input.is_instructor === "boolean"
        ? { is_instructor: input.is_instructor }
        : {}),
      ...(typeof input.is_mentor === "boolean"
        ? { is_mentor: input.is_mentor }
        : {}),
    })
    .eq("id", id)
    .select(PROFILE_COLUMNS)
    .single();
}

export async function updateProfileInstructorFlag(
  client: Supabase,
  id: string,
  isInstructor: boolean
) {
  return client
    .from("profiles")
    .update({ is_instructor: isInstructor })
    .eq("id", id)
    .select(PROFILE_COLUMNS)
    .single();
}

export async function updateProfileMentorFlag(
  client: Supabase,
  id: string,
  isMentor: boolean
) {
  return client
    .from("profiles")
    .update({ is_mentor: isMentor })
    .eq("id", id)
    .select(PROFILE_COLUMNS)
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
    .select(PROFILE_COLUMNS)
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

export async function listInstructorProfiles(client: Supabase) {
  return client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("is_instructor", true)
    .order("username", { ascending: true });
}

/** Slim rows for teacher/instructor pickers (`id`, `username` only). */
export async function listInstructorProfileOptions(client: Supabase) {
  return client
    .from("profiles")
    .select(PROFILE_OPTION_COLUMNS)
    .eq("is_instructor", true)
    .order("username", { ascending: true });
}

export async function listProfileOptionsByIds(client: Supabase, ids: string[]) {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  return client.from("profiles").select(PROFILE_OPTION_COLUMNS).in("id", ids);
}

export async function listInstructorProfileIds(client: Supabase) {
  return client.from("profiles").select("id").eq("is_instructor", true);
}

export async function listNonInstructorProfiles(client: Supabase) {
  return client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("is_instructor", false)
    .order("username", { ascending: true });
}

export async function listMentorProfiles(client: Supabase) {
  return client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("is_mentor", true)
    .order("username", { ascending: true });
}

export async function listMentorProfileIds(client: Supabase) {
  return client.from("profiles").select("id").eq("is_mentor", true);
}

export async function listNonMentorProfiles(client: Supabase) {
  return client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("is_mentor", false)
    .order("username", { ascending: true });
}

export async function setProfilesMentorFlag(
  client: Supabase,
  ids: string[],
  isMentor: boolean
) {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("profiles")
    .update({ is_mentor: isMentor })
    .in("id", ids)
    .select(PROFILE_COLUMNS);
}

export async function setProfilesInstructorFlag(
  client: Supabase,
  ids: string[],
  isInstructor: boolean
) {
  if (ids.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("profiles")
    .update({ is_instructor: isInstructor })
    .in("id", ids)
    .select(PROFILE_COLUMNS);
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

export async function listProfilesByIds(client: Supabase, ids: string[]) {
  return chunkedIn(ids, (chunk) =>
    client.from("profiles").select(PROFILE_COLUMNS).in("id", chunk)
  );
}
