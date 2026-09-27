export const AUTH_BACKUP_TABLES = ["users", "identities"] as const;

export type AuthBackupTableName = (typeof AUTH_BACKUP_TABLES)[number];

export interface AuthSchemaBackupPayload {
  exportedAt: string;
  scope: "auth";
  tables: Record<AuthBackupTableName, Record<string, unknown>[]>;
}
