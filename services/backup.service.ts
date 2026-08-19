import {
  BACKUP_TABLES,
  type BackupTableName,
} from "@/lib/constants/backup-tables";
import * as backupRepository from "@/repositories/backup.repository";
import type {
  BackupExportPayload,
  FullBackupPayload,
  TableBackupPayload,
} from "@/types/backup-export";

type BackupClient = Parameters<typeof backupRepository.exportTableRows>[0];

export type BackupExportResult = BackupExportPayload;

export function isBackupTableName(value: string): value is BackupTableName {
  return BACKUP_TABLES.includes(value as BackupTableName);
}

export async function exportSingleTableBackup(
  client: BackupClient,
  tableName: BackupTableName
): Promise<TableBackupPayload> {
  const { data, error } = await backupRepository.exportTableRows(client, tableName);

  if (error) {
    throw new Error(`Unable to export ${tableName}.`);
  }

  return {
    exportedAt: new Date().toISOString(),
    scope: "table",
    table: tableName,
    rows: data ?? [],
  };
}

export async function exportFullDatabaseBackup(
  client: BackupClient
): Promise<FullBackupPayload> {
  const tableEntries = await Promise.all(
    BACKUP_TABLES.map(async (tableName) => {
      const { data, error } = await backupRepository.exportTableRows(
        client,
        tableName
      );

      if (error) {
        throw new Error(`Unable to export ${tableName}.`);
      }

      return [tableName, data ?? []] as const;
    })
  );

  return {
    exportedAt: new Date().toISOString(),
    scope: "all",
    tables: Object.fromEntries(tableEntries) as Record<BackupTableName, unknown[]>,
  };
}
