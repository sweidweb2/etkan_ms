import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { createAuthSettingsBackupFilename } from "@/lib/export/backup-auth-serialize";
import * as backupAuthSettingsRepository from "@/repositories/backup-auth-settings.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import type { BackupAuthSettingsPayload } from "@/types/backup-auth-settings";

type BackupAuthSettingsClient = Parameters<typeof getUnauthorizedError>[0];

export async function getBackupAuthSettingsExportUnauthorized(
  client: BackupAuthSettingsClient,
  userId: string | null
): Promise<string | null> {
  const settingsDenied = await getUnauthorizedError(
    client,
    userId,
    PERMISSIONS.BACKUP_EXPORT_AUTH_SETTINGS
  );
  if (!settingsDenied) {
    return null;
  }

  return getUnauthorizedError(client, userId, PERMISSIONS.BACKUP_EXPORT_FULL);
}

export async function exportAuthSettingsBackup(): Promise<{
  body: string;
  contentType: string;
  fileName: string;
  complete: boolean;
  payload: BackupAuthSettingsPayload;
}> {
  const [publicSettingsResult, managementResult] = await Promise.all([
    backupAuthSettingsRepository.fetchGoTruePublicSettings(),
    backupAuthSettingsRepository.fetchManagementAuthConfig(),
  ]);

  const missing: string[] = [];
  const notes: string[] = [
    "Site URL, redirect URLs, email templates, SMTP, and OAuth apps live in the Supabase dashboard, not in SQL migrations.",
  ];

  if (managementResult.missingToken) {
    missing.push("SUPABASE_ACCESS_TOKEN");
    notes.push(
      "Set SUPABASE_ACCESS_TOKEN to a personal access token with auth_config_read, then export again for SMTP, templates, and OAuth secrets."
    );
  }

  if (publicSettingsResult.error) {
    notes.push(publicSettingsResult.error);
  }

  if (managementResult.error) {
    notes.push(managementResult.error);
  }

  const payload: BackupAuthSettingsPayload = {
    exportedAt: new Date().toISOString(),
    scope: "auth_settings",
    projectRef: managementResult.projectRef,
    complete: Boolean(managementResult.data) && !managementResult.missingToken,
    publicSettings: publicSettingsResult.data,
    managementConfig: managementResult.data,
    missing,
    notes,
  };

  return {
    body: `${JSON.stringify(payload, null, 2)}\n`,
    contentType: "application/json; charset=utf-8",
    fileName: createAuthSettingsBackupFilename(),
    complete: payload.complete,
    payload,
  };
}
