import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type ClearInstructorRelatedDataResult = {
  capabilities: number;
  workshop_instructors: number;
  schedule_slots: number;
};

function parseClearResult(data: Json | null): ClearInstructorRelatedDataResult {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      capabilities: 0,
      workshop_instructors: 0,
      schedule_slots: 0,
    };
  }

  const record = data as Record<string, unknown>;
  return {
    capabilities:
      typeof record.capabilities === "number" ? record.capabilities : 0,
    workshop_instructors:
      typeof record.workshop_instructors === "number"
        ? record.workshop_instructors
        : 0,
    schedule_slots:
      typeof record.schedule_slots === "number" ? record.schedule_slots : 0,
  };
}

export async function clearInstructorRelatedData(
  client: Supabase,
  userId: string
) {
  const { data, error } = await client.rpc("clear_instructor_related_data", {
    p_user_id: userId,
  });

  if (error) {
    return { data: null, error };
  }

  return { data: parseClearResult(data), error: null };
}
