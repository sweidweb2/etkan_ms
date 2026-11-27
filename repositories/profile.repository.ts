import "server-only";

import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { chunkedIn } from "@/repositories/_shared/chunked-in";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const PROFILE_COLUMNS =
  "id, full_name, role, is_instructor, avatar_url, created_at";

const PROFILE_OPTION_COLUMNS = "id, full_name";

export async function findProfileById(client: Supabase, id: string) {
  return client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function findProfileAvatarUrlById(client: Supabase, id: string) {
  return client
    .from("profiles")
    .select("id, avatar_url")
    .eq("id", id)
    .maybeSingle();
}

export async function updateProfileAvatarUrl(
  client: Supabase,
  id: string,
  avatarUrl: string | null
) {
  return client
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", id)
    .select("id, avatar_url")
    .maybeSingle();
}

export async function findRoleById(client: Supabase, id: string) {
  return client.from("profiles").select("role").eq("id", id).maybeSingle();
}

export async function createProfile(
  client: Supabase,
  input: {
    id: string;
    full_name: string;
    role: RoleValue;
    is_instructor?: boolean;
  }
) {
  return client
    .from("profiles")
    .insert({
      id: input.id,
      full_name: input.full_name,
      role: input.role,
      is_instructor: input.is_instructor ?? false,
    })
    .select("id, role, is_instructor")
    .single();
}

export async function deleteProfileById(client: Supabase, id: string) {
  return client.from("profiles").delete().eq("id", id);
}

export async function updateProfileById(
  client: Supabase,
  id: string,
  input: {
    full_name: string;
    role?: RoleValue;
    is_instructor?: boolean;
  }
) {
  return client
    .from("profiles")
    .update({
      full_name: input.full_name,
      ...(input.role ? { role: input.role } : {}),
      ...(typeof input.is_instructor === "boolean"
        ? { is_instructor: input.is_instructor }
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

export type ListProfilesOptions = {
  roles?: RoleValue[];
  search?: string;
  excludeRoles?: RoleValue[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Strips characters that would break PostgREST `or()` filters / ilike wildcards. */
function sanitizeSearchTerm(search: string) {
  return search.replace(/[%_*,()\\]/g, " ").replace(/\s+/g, " ").trim();
}

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

  if (options?.excludeRoles?.length) {
    query = query.not(
      "role",
      "in",
      `(${options.excludeRoles.join(",")})`
    );
  }

  const search = options?.search?.trim();
  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  return query;
}

/**
 * One page of profiles (newest first) plus the exact filtered count.
 * Search matches `full_name` (and `id` when the term is a UUID).
 * Optional `ids` restricts to that set (caller should keep lists PostgREST-safe).
 */
export async function listProfilesPage(
  client: Supabase,
  options: {
    offset: number;
    limit: number;
    roles?: RoleValue[];
    search?: string | null;
    excludeRoles?: RoleValue[];
    ids?: string[];
  }
) {
  let query = client
    .from("profiles")
    .select(PROFILE_COLUMNS, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (options.ids?.length) {
    query = query.in("id", options.ids);
  }

  if (options.roles?.length) {
    query = query.in("role", options.roles);
  }

  if (options.excludeRoles?.length) {
    query = query.not(
      "role",
      "in",
      `(${options.excludeRoles.join(",")})`
    );
  }

  const search = options.search ? sanitizeSearchTerm(options.search) : "";
  if (search) {
    const filters = [`full_name.ilike.%${search}%`];
    if (UUID_PATTERN.test(search)) {
      filters.push(`id.eq.${search}`);
    }
    query = query.or(filters.join(","));
  }

  return query.range(options.offset, options.offset + options.limit - 1);
}

export async function listInstructorProfiles(client: Supabase) {
  return client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("is_instructor", true)
    .order("full_name", { ascending: true });
}

/** Slim rows for class teacher pickers (`id`, `full_name` only). */
export async function listTeacherProfileOptions(client: Supabase) {
  return client
    .from("profiles")
    .select(PROFILE_OPTION_COLUMNS)
    .eq("role", ROLES.TEACHER)
    .order("full_name", { ascending: true });
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
    .order("full_name", { ascending: true });
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
  options?: Pick<ListProfilesOptions, "roles" | "excludeRoles">
) {
  let query = client
    .from("profiles")
    .select("id", { count: "exact", head: true });

  if (options?.roles?.length) {
    query = query.in("role", options.roles);
  }

  if (options?.excludeRoles?.length) {
    query = query.not(
      "role",
      "in",
      `(${options.excludeRoles.join(",")})`
    );
  }

  return query;
}

export async function listProfilesByIds(client: Supabase, ids: string[]) {
  return chunkedIn(ids, (chunk) =>
    client.from("profiles").select(PROFILE_COLUMNS).in("id", chunk)
  );
}
