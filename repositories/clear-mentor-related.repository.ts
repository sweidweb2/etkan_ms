import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type ClearMentorRelatedDataResult = {
  capabilities: number;
};

function parseClearResult(data: Json | null): ClearMentorRelatedDataResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { capabilities: 0 };
  }

  const record = data as Record<string, unknown>;
  return {
    capabilities:
      typeof record.capabilities === "number" ? record.capabilities : 0,
  };
}

export async function clearMentorRelatedData(
  client: Supabase,
  userId: string
) {
  const { data, error } = await client.rpc("clear_mentor_related_data", {
    p_user_id: userId,
  });

  if (error) {
    return { data: null, error };
  }

  return { data: parseClearResult(data), error: null };
}
