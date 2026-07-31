import type { ClassRecord } from "@/repositories/class.repository";
import * as classRepository from "@/repositories/class.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/**
 * Resolve the billing class for a semester: status = in_progress.
 * If multiple in-progress classes exist, use the oldest by created_at.
 */
export async function resolveInProgressClassForSemester(
  adminClient: Supabase,
  semesterId: string
): Promise<ClassRecord | null> {
  const { data, error } =
    await classRepository.findInProgressClassBySemesterId(
      adminClient,
      semesterId
    );

  if (error) {
    throw new Error(error.message);
  }

  return (data as ClassRecord | null) ?? null;
}
