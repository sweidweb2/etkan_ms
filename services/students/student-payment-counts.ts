import "server-only";

import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/** Payment row counts keyed by student_payment_phase id. */
export async function loadPaymentCountsBySppIds(
  adminClient: Supabase,
  sppIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  for (const id of sppIds) {
    counts.set(id, 0);
  }

  if (sppIds.length === 0) {
    return counts;
  }

  const { data, error } =
    await studentPaymentRepository.listPaymentSppIdsBySppIds(
      adminClient,
      sppIds
    );

  if (error) {
    throw new Error(error.message);
  }

  for (const row of data ?? []) {
    const sppId = row.student_payment_phase_id;
    counts.set(sppId, (counts.get(sppId) ?? 0) + 1);
  }

  return counts;
}
