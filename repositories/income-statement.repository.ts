import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type IncomeStatementActivityMonth = {
  year: number;
  month: number;
};

/** Distinct months with payment / adjustment / transaction activity (DB-side). */
export async function listIncomeStatementActivityMonths(client: Supabase) {
  const { data, error } = await client.rpc(
    "list_income_statement_activity_months"
  );

  if (error) {
    return { data: null as IncomeStatementActivityMonth[] | null, error };
  }

  const months: IncomeStatementActivityMonth[] = [];
  for (const row of data ?? []) {
    const year = Number(row.year);
    const month = Number(row.month);
    if (
      !Number.isFinite(year) ||
      !Number.isFinite(month) ||
      month < 1 ||
      month > 12
    ) {
      continue;
    }
    months.push({ year, month });
  }

  return { data: months, error: null };
}
