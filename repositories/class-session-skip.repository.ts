import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const CLASS_SESSION_SKIP_COLUMNS =
  "id, class_id, skip_date, reason, created_by, created_at";

export type ClassSessionSkipRecord = {
  id: string;
  class_id: string;
  skip_date: string;
  reason: string | null;
  created_by: string | null;
  created_at: string;
};

export async function listClassSessionSkipsByClassId(
  client: Supabase,
  classId: string
) {
  return client
    .from("class_session_skips")
    .select(CLASS_SESSION_SKIP_COLUMNS)
    .eq("class_id", classId)
    .order("skip_date", { ascending: true });
}

export async function findClassSessionSkip(
  client: Supabase,
  classId: string,
  skipDate: string
) {
  return client
    .from("class_session_skips")
    .select(CLASS_SESSION_SKIP_COLUMNS)
    .eq("class_id", classId)
    .eq("skip_date", skipDate)
    .maybeSingle();
}

/** Inserts the skip and, when `sessionId` is set, deletes that session atomically. */
export async function skipClassWeek(
  client: Supabase,
  input: {
    classId: string;
    skipDate: string;
    reason: string | null;
    createdBy: string | null;
    sessionId: string | null;
  }
) {
  return client.rpc("skip_class_week", {
    p_class_id: input.classId,
    p_skip_date: input.skipDate,
    p_reason: input.reason,
    p_created_by: input.createdBy,
    p_session_id: input.sessionId,
  });
}

export async function deleteClassSessionSkipById(client: Supabase, id: string) {
  return client.from("class_session_skips").delete().eq("id", id);
}

export async function createNextWeeklySessionForClass(
  client: Supabase,
  classId: string,
  leadDays: number
) {
  return client.rpc("create_next_weekly_session_for_class", {
    p_class_id: classId,
    p_lead_days: leadDays,
  });
}
