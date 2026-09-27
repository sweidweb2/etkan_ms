import { getBackupTableOrderColumns } from "@/lib/constants/backup-tables";
import type { BackupTableName } from "@/lib/constants/backup-tables";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/** Matches hosted PostgREST `max_rows`. Each page stays inside that cap. */
export const BACKUP_EXPORT_PAGE_SIZE = 1000;
const MAX_EXPORT_PAGES = 10_000;

export async function exportTableRows(
  client: Supabase,
  tableName: BackupTableName
) {
  const orderColumns = getBackupTableOrderColumns(tableName);
  const rows: unknown[] = [];
  let from = 0;
  let previousFirstRow: string | null = null;

  for (let pageIndex = 0; pageIndex < MAX_EXPORT_PAGES; pageIndex += 1) {
    // Dynamic table name: avoid TS2589 union explosion on Database["public"]["Tables"].
    let query = (client as SupabaseClient).from(tableName).select("*");

    for (const column of orderColumns) {
      query = query.order(column, { ascending: true });
    }

    const { data, error } = await query.range(
      from,
      from + BACKUP_EXPORT_PAGE_SIZE - 1
    );

    if (error) {
      return { data: null, error };
    }

    const page = data ?? [];
    if (page.length === 0) {
      return { data: rows, error: null };
    }

    const firstRow = JSON.stringify(page[0]);
    if (firstRow === previousFirstRow) {
      return {
        data: null,
        error: { message: `Unable to page ${tableName}.` },
      };
    }

    previousFirstRow = firstRow;
    rows.push(...page);

    if (page.length < BACKUP_EXPORT_PAGE_SIZE) {
      return { data: rows, error: null };
    }

    from += BACKUP_EXPORT_PAGE_SIZE;
  }

  return {
    data: null,
    error: { message: `Unable to export ${tableName}.` },
  };
}
