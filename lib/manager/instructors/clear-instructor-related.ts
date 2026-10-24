import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import * as clearInstructorRelatedRepository from "@/repositories/clear-instructor-related.repository";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type ClearInstructorRelatedResult = {
  error: string | null;
};

/**
 * When `is_instructor` is turned off: capabilities → workshop assignments →
 * instructor schedule slots (entity_type = instructor), in one RPC.
 */
export async function clearInstructorWorkshopRelatedData(
  admin: Supabase,
  userId: string
): Promise<ClearInstructorRelatedResult> {
  const { error } =
    await clearInstructorRelatedRepository.clearInstructorRelatedData(
      admin,
      userId
    );

  if (error) {
    return {
      error:
        error.message || "Unable to clear instructor-related workshop data.",
    };
  }

  return { error: null };
}
