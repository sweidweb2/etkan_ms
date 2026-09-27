export type BackupHistoryScope =
  | "table"
  | "all"
  | "auth"
  | "storage"
  | "auth_settings";

export interface BackupHistoryEntry {
  id: string;
  scope: BackupHistoryScope;
  tableName: string | null;
  fileName: string;
  rowCount: number;
  tableCount: number;
  createdAt: string;
  createdByLabel: string;
}
