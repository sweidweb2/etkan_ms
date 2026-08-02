import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type InstructorSubjectCapabilityRecord = {
  id: string;
  user_id: string;
  subject_id: string;
  created_at: string;
};

export async function listAllInstructorSubjectCapabilities(client: Supabase) {
  return client
    .from("instructor_subject_capability")
    .select("id, user_id, subject_id, created_at")
    .order("created_at", { ascending: true });
}

export async function deleteCapabilitiesByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("instructor_subject_capability")
    .delete()
    .eq("user_id", userId);
}

export async function deleteCapabilitiesByPairs(
  client: Supabase,
  pairs: { user_id: string; subject_id: string }[]
) {
  if (pairs.length === 0) {
    return { error: null };
  }

  // Delete one pair at a time to avoid complex OR filters.
  for (const pair of pairs) {
    const { error } = await client
      .from("instructor_subject_capability")
      .delete()
      .eq("user_id", pair.user_id)
      .eq("subject_id", pair.subject_id);

    if (error) {
      return { error };
    }
  }

  return { error: null };
}

export async function insertCapabilities(
  client: Supabase,
  pairs: { user_id: string; subject_id: string }[]
) {
  if (pairs.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("instructor_subject_capability")
    .insert(pairs)
    .select("id, user_id, subject_id, created_at");
}
