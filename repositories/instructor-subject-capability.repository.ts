import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SubjectCapabilityRecord } from "@/repositories/subject-capability";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/** Rows are normalized to `subject_id` so scoped callers share one shape. */
export async function listCapabilitiesByUserIds(
  client: Supabase,
  userIds: string[]
): Promise<{ data: SubjectCapabilityRecord[]; error: PostgrestError | null }> {
  if (userIds.length === 0) {
    return { data: [], error: null };
  }

  const { data, error } = await client
    .from("instructor_subject_capability")
    .select("id, user_id, instructor_subject_id, created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: true });

  if (error) {
    return { data: [], error };
  }

  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      subject_id: row.instructor_subject_id,
      created_at: row.created_at,
    })),
    error: null,
  };
}

export async function deleteCapabilitiesByPairs(
  client: Supabase,
  pairs: { user_id: string; subject_id: string }[]
) {
  if (pairs.length === 0) {
    return { data: 0, error: null };
  }

  return client.rpc("delete_instructor_subject_capability_pairs", {
    p_user_ids: pairs.map((pair) => pair.user_id),
    p_instructor_subject_ids: pairs.map((pair) => pair.subject_id),
  });
}

export async function insertCapabilities(
  client: Supabase,
  pairs: { user_id: string; subject_id: string }[]
) {
  if (pairs.length === 0) {
    return { data: [], error: null };
  }

  return client.from("instructor_subject_capability").insert(
    pairs.map((pair) => ({
      user_id: pair.user_id,
      instructor_subject_id: pair.subject_id,
    }))
  );
}
