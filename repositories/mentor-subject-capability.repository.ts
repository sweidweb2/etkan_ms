import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type MentorSubjectCapabilityRecord = {
  id: string;
  user_id: string;
  mentor_subject_id: string;
  created_at: string;
};

export async function listMentorSubjectCapabilitiesByUserIds(
  client: Supabase,
  userIds: string[]
) {
  if (userIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("mentor_subject_capability")
    .select("id, user_id, mentor_subject_id, created_at")
    .in("user_id", userIds)
    .order("created_at", { ascending: true });
}

export async function deleteCapabilitiesByUserId(
  client: Supabase,
  userId: string
) {
  return client
    .from("mentor_subject_capability")
    .delete()
    .eq("user_id", userId);
}

export async function deleteCapabilitiesByPairs(
  client: Supabase,
  pairs: { user_id: string; mentor_subject_id: string }[]
) {
  if (pairs.length === 0) {
    return { error: null };
  }

  const subjectIdsByUserId = new Map<string, string[]>();
  for (const pair of pairs) {
    const subjectIds = subjectIdsByUserId.get(pair.user_id) ?? [];
    subjectIds.push(pair.mentor_subject_id);
    subjectIdsByUserId.set(pair.user_id, subjectIds);
  }

  for (const [userId, mentorSubjectIds] of subjectIdsByUserId) {
    const { error } = await client
      .from("mentor_subject_capability")
      .delete()
      .eq("user_id", userId)
      .in("mentor_subject_id", mentorSubjectIds);

    if (error) {
      return { error };
    }
  }

  return { error: null };
}

export async function insertCapabilities(
  client: Supabase,
  pairs: { user_id: string; mentor_subject_id: string }[]
) {
  if (pairs.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("mentor_subject_capability")
    .insert(pairs)
    .select("id, user_id, mentor_subject_id, created_at");
}
