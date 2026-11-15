import "server-only";

import { BACKUP_EXPORT_FORMATS } from "@/lib/constants/backup-formats";
import { DATABASE_BACKUPS_STORAGE_BUCKET } from "@/lib/constants/database-backups-storage";
import { SITE } from "@/lib/config/site";
import { serializeBackupExport } from "@/lib/export/backup-serialize";
import { uploadObject } from "@/repositories/object-storage.repository";
import {
  exportAuthUsersBackup,
} from "@/services/backup/backup-auth.service";
import { exportFullDatabaseBackup } from "@/services/backup/backup.service";
import { recordBackupHistory } from "@/services/backup/backup-history.service";

type AdminClient = Parameters<typeof exportFullDatabaseBackup>[0];

export type ScheduledDatabaseBackupResult = {
  bucket: typeof DATABASE_BACKUPS_STORAGE_BUCKET;
  objectPath: string;
  fileName: string;
  byteLength: number;
  publicTableCount: number;
  publicRowCount: number;
  authRowCount: number;
};

function buildObjectPath(fileName: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `weekly/${year}/${month}/${day}/${fileName}`;
}

function createCombinedSqlFileName(): string {
  const dateStamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `etkan-db-backup-${dateStamp}.sql`;
}

/**
 * Export all public tables + auth.users/identities as one SQL file and
 * upload to the private `database-backups` bucket. No media/storage files.
 */
export async function runScheduledDatabaseSqlBackup(
  client: AdminClient
): Promise<ScheduledDatabaseBackupResult> {
  const [tablesPayload, authExport] = await Promise.all([
    exportFullDatabaseBackup(client),
    exportAuthUsersBackup(client),
  ]);

  const tablesSql = await serializeBackupExport(
    tablesPayload,
    BACKUP_EXPORT_FORMATS.SQL
  );

  const publicRowCount = Object.values(tablesPayload.tables).reduce(
    (total, rows) => total + rows.length,
    0
  );
  const publicTableCount = Object.keys(tablesPayload.tables).length;

  const combinedSql = [
    `-- ${SITE.systemName} weekly automated database backup`,
    `-- Exported at: ${new Date().toISOString()}`,
    "-- Contents: all public tables (SQL inserts) + auth.users / auth.identities",
    "-- Media / storage buckets are NOT included.",
    "",
    "-- ========== PUBLIC TABLES ==========",
    "",
    typeof tablesSql.body === "string"
      ? tablesSql.body
      : new TextDecoder().decode(tablesSql.body),
    "",
    "-- ========== AUTH USERS ==========",
    "",
    authExport.body,
    "",
  ].join("\n");

  const fileName = createCombinedSqlFileName();
  const objectPath = buildObjectPath(fileName);
  const body = Buffer.from(combinedSql, "utf8");

  const { error } = await uploadObject(
    client,
    DATABASE_BACKUPS_STORAGE_BUCKET,
    objectPath,
    body,
    "application/sql; charset=utf-8"
  );

  if (error) {
    throw new Error(`Unable to upload database backup: ${error.message}`);
  }

  await recordBackupHistory(client, {
    createdBy: null,
    createdByLabel: "Weekly backup job",
    scope: "all",
    tableName: null,
    fileName: objectPath,
    rowCount: publicRowCount + authExport.rowCount,
    tableCount: publicTableCount + authExport.tableCount,
  });

  return {
    bucket: DATABASE_BACKUPS_STORAGE_BUCKET,
    objectPath,
    fileName,
    byteLength: body.byteLength,
    publicTableCount,
    publicRowCount,
    authRowCount: authExport.rowCount,
  };
}

export async function listRecentDatabaseBackupObjects(
  client: AdminClient,
  folderPath: string
): Promise<{ name: string; id: string | null; updatedAt: string | null }[]> {
  const { data, error } = await client.storage
    .from(DATABASE_BACKUPS_STORAGE_BUCKET)
    .list(folderPath, {
      limit: 50,
      sortBy: { column: "name", order: "desc" },
    });

  if (error) {
    throw new Error(`Unable to list database backups: ${error.message}`);
  }

  return (data ?? [])
    .filter((entry) => entry.name && !entry.name.endsWith("/"))
    .map((entry) => ({
      name: entry.name,
      id: entry.id ?? null,
      updatedAt: entry.updated_at ?? null,
    }));
}
