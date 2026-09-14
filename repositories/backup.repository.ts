import type { BackupTableName } from "@/lib/constants/backup-tables";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function exportTableRows(
  client: Supabase,
  tableName: BackupTableName
) {
  // Dynamic table name: avoid TS2589 union explosion on Database["public"]["Tables"].
  return (client as SupabaseClient).from(tableName).select("*");
}
