import "server-only";

import * as backupHistoryRepository from "@/repositories/backup-history.repository";
import type { BackupHistoryEntry, BackupHistoryScope } from "@/types/backup-history";

type BackupHistoryClient = Parameters<
  typeof backupHistoryRepository.createBackupHistoryEntry
>[0];

type CreateBackupHistoryInput = {
  createdBy: string | null;
  createdByLabel: string;
  scope: BackupHistoryScope;
  tableName?: string | null;
  fileName: string;
  rowCount: number;
  tableCount: number;
};

export async function recordBackupHistory(
  client: BackupHistoryClient,
  input: CreateBackupHistoryInput
) {
  const { error } = await backupHistoryRepository.createBackupHistoryEntry(client, {
    created_by: input.createdBy,
    created_by_label: input.createdByLabel,
    scope: input.scope,
    table_name: input.tableName ?? null,
    file_name: input.fileName,
    row_count: input.rowCount,
    table_count: input.tableCount,
  });

  if (error) {
    throw new Error("Unable to record backup history.");
  }
}

export async function getRecentBackupHistory(
  client: BackupHistoryClient,
  limit = 12
): Promise<BackupHistoryEntry[]> {
  const { data, error } = await backupHistoryRepository.listRecentBackupHistory(
    client,
    limit
  );

  if (error) {
    return [];
  }

  return (data ?? []).map(backupHistoryRepository.mapBackupHistoryRow);
}
