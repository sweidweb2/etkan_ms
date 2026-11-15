import type { BackupTableName } from "@/lib/constants/backup-tables";

export interface TableBackupPayload {
  exportedAt: string;
  scope: "table";
  table: BackupTableName;
  rows: unknown[];
  /** Related tables used to resolve FK labels for business CSV. */
  lookups?: Partial<Record<BackupTableName, unknown[]>>;
}

export interface FullBackupPayload {
  exportedAt: string;
  scope: "all";
  tables: Record<BackupTableName, unknown[]>;
}

export type BackupExportPayload = TableBackupPayload | FullBackupPayload;
