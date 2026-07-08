import type { BackupHistoryEntry, BackupHistoryScope } from "@/types/backup-history";

type BackupHistoryInsert = {
  created_by: string | null;
  created_by_label: string;
  scope: BackupHistoryScope;
  table_name: string | null;
  file_name: string;
  row_count: number;
  table_count: number;
};

type QueryError = { message: string } | null;

type BackupHistoryClient = {
  from: (tableName: string) => {
    insert: (values: BackupHistoryInsert) => Promise<{ error: QueryError }>;
    select: (columns: string) => {
      order: (
        column: string,
        options: { ascending: boolean }
      ) => {
        limit: (
          count: number
        ) => Promise<{ data: BackupHistoryRow[] | null; error: QueryError }>;
      };
    };
  };
};

type BackupHistoryRow = {
  id: string;
  scope: BackupHistoryScope;
  table_name: string | null;
  file_name: string;
  row_count: number | null;
  table_count: number | null;
  created_at: string | null;
  created_by_label: string | null;
};

export async function createBackupHistoryEntry(
  client: BackupHistoryClient,
  values: BackupHistoryInsert
) {
  return client.from("backup_history").insert(values);
}

export async function listRecentBackupHistory(
  client: BackupHistoryClient,
  limit = 12
) {
  return client
    .from("backup_history")
    .select(
      "id, scope, table_name, file_name, row_count, table_count, created_at, created_by_label"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
}

export function mapBackupHistoryRow(row: BackupHistoryRow): BackupHistoryEntry {
  return {
    id: row.id,
    scope: row.scope,
    tableName: row.table_name,
    fileName: row.file_name,
    rowCount: row.row_count ?? 0,
    tableCount: row.table_count ?? 0,
    createdAt: row.created_at ?? new Date(0).toISOString(),
    createdByLabel: row.created_by_label?.trim() || "User",
  };
}
