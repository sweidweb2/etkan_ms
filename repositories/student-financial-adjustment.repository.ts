import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function listAdjustmentsBySppIds(
  client: Supabase,
  sppIds: string[]
) {
  if (sppIds.length === 0) {
    return { data: [], error: null };
  }

  return client
    .from("student_financial_adjustments")
    .select("student_payment_phase_id, value_type, value")
    .in("student_payment_phase_id", sppIds);
}
