import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  createAuthBackupFilename,
  serializeAuthSchemaBackupToSql,
} from "@/lib/export/backup-auth-serialize";
import * as backupAuthRepository from "@/repositories/backup-auth.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import { AUTH_BACKUP_TABLES } from "@/types/backup-auth";
import type { AuthSchemaBackupPayload } from "@/types/backup-auth";

type BackupAuthClient = Parameters<
  typeof backupAuthRepository.exportAuthSchemaBackup
>[0];

export async function getBackupAuthExportUnauthorized(
  client: BackupAuthClient,
  userId: string | null
): Promise<string | null> {
  const authDenied = await getUnauthorizedError(
    client,
    userId,
    PERMISSIONS.BACKUP_EXPORT_AUTH
  );
  if (!authDenied) {
    return null;
  }

  return getUnauthorizedError(client, userId, PERMISSIONS.BACKUP_EXPORT_FULL);
}

function asRowArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    return [item as Record<string, unknown>];
  });
}

export function parseAuthSchemaBackupPayload(
  value: unknown
): AuthSchemaBackupPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Unable to export auth users.");
  }

  const payload = value as {
    exportedAt?: unknown;
    tables?: Record<string, unknown>;
  };

  const tables = payload.tables;
  if (!tables || typeof tables !== "object" || Array.isArray(tables)) {
    throw new Error("Unable to export auth users.");
  }

  return {
    exportedAt:
      typeof payload.exportedAt === "string"
        ? payload.exportedAt
        : new Date().toISOString(),
    scope: "auth",
    tables: {
      users: asRowArray(tables.users),
      identities: asRowArray(tables.identities),
    },
  };
}

export async function exportAuthUsersBackup(client: BackupAuthClient): Promise<{
  body: string;
  contentType: string;
  fileName: string;
  rowCount: number;
  tableCount: number;
}> {
  const { data, error } = await backupAuthRepository.exportAuthSchemaBackup(
    client
  );

  if (error || data == null) {
    throw new Error(error?.message ?? "Unable to export auth users.");
  }

  const payload = parseAuthSchemaBackupPayload(data);
  const rowCount = AUTH_BACKUP_TABLES.reduce(
    (total, tableName) => total + payload.tables[tableName].length,
    0
  );

  return {
    body: serializeAuthSchemaBackupToSql(payload),
    contentType: "application/sql; charset=utf-8",
    fileName: createAuthBackupFilename(),
    rowCount,
    tableCount: AUTH_BACKUP_TABLES.length,
  };
}
