export const BACKUP_EXPORT_FORMATS = {
  JSON: "json",
  SQL: "sql",
  CSV: "csv",
} as const;

export const BACKUP_EXPORT_FORMAT_VALUES = [
  BACKUP_EXPORT_FORMATS.JSON,
  BACKUP_EXPORT_FORMATS.SQL,
  BACKUP_EXPORT_FORMATS.CSV,
] as const;

export type BackupExportFormat = (typeof BACKUP_EXPORT_FORMAT_VALUES)[number];

export const BACKUP_EXPORT_FORMAT_LABELS: Record<BackupExportFormat, string> = {
  json: "JSON (.json)",
  sql: "SQL (.sql)",
  csv: "CSV (.csv)",
};

export function isBackupExportFormat(
  value: string
): value is BackupExportFormat {
  return BACKUP_EXPORT_FORMAT_VALUES.includes(value as BackupExportFormat);
}
