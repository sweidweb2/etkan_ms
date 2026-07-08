import {
  BACKUP_TABLES,
  type BackupTableName,
} from "@/lib/constants/backup-tables";
import * as backupRepository from "@/repositories/backup.repository";

type BackupClient = Parameters<typeof backupRepository.exportTableRows>[0];

type TableBackupResult = {
  exportedAt: string;
  scope: "table";
  table: BackupTableName;
  rows: unknown[];
};

type FullBackupResult = {
  exportedAt: string;
  scope: "all";
  tables: Record<BackupTableName, unknown[]>;
};

export type BackupExportResult = TableBackupResult | FullBackupResult;

export function isBackupTableName(value: string): value is BackupTableName {
  return BACKUP_TABLES.includes(value as BackupTableName);
}

export async function exportSingleTableBackup(
  client: BackupClient,
  tableName: BackupTableName
): Promise<TableBackupResult> {
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
): Promise<FullBackupResult> {
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
