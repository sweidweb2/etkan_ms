export type BackupHistoryScope = "table" | "all";

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
