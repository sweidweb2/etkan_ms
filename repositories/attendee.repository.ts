import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function listAttendeesBySessionIds(
  client: Supabase,
  sessionIds: string[]
) {
  if (sessionIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("attendee")
    .select("session_id, student_id, status")
    .in("session_id", sessionIds);
}
