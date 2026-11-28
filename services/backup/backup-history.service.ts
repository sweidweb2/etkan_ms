import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import * as backupHistoryRepository from "@/repositories/backup-history.repository";
import { assertPermission } from "@/services/auth/authorization.service";
import { recordManagerAuditLog } from "@/services/ops/audit-log.service";
import type { BackupHistoryEntry, BackupHistoryScope } from "@/types/backup-history";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type BackupHistoryClient = Parameters<
  typeof backupHistoryRepository.createBackupHistoryEntry
>[0];

type AuthClient = SupabaseClient<Database>;

type CreateBackupHistoryInput = {
  createdBy: string | null;
  createdByLabel: string;
  scope: BackupHistoryScope;
  tableName?: string | null;
  fileName: string;
  rowCount: number;
  tableCount: number;
};

export async function recordBackupHistory(
  client: BackupHistoryClient,
  input: CreateBackupHistoryInput
) {
  const { error } = await backupHistoryRepository.createBackupHistoryEntry(client, {
    created_by: input.createdBy,
    created_by_label: input.createdByLabel,
    scope: input.scope,
    table_name: input.tableName ?? null,
    file_name: input.fileName,
    row_count: input.rowCount,
    table_count: input.tableCount,
  });

  if (error) {
    throw new Error("Unable to record backup history.");
  }

  await recordManagerAuditLog(
    client as AuthClient,
    {
      userId: input.createdBy,
      userLabel: input.createdByLabel.trim() || "System",
    },
    {
      action: "export",
      severity: "warning",
      table_name: "backup_history",
      new_data: {
        file_name: input.fileName,
        scope: input.scope,
        table_name: input.tableName ?? null,
        row_count: input.rowCount,
        table_count: input.tableCount,
      },
      metadata: {
        note:
          input.scope === "all"
            ? "Full database backup exported."
            : `Backup exported (${input.scope}).`,
        scope: input.scope,
        table_name: input.tableName ?? null,
        file_name: input.fileName,
        row_count: input.rowCount,
        table_count: input.tableCount,
      },
    }
  );
}

/** How many recent export rows the Backup page loads for client filters/paging. */
export const BACKUP_HISTORY_PAGE_LIMIT = 100;

export async function getRecentBackupHistory(
  client: BackupHistoryClient,
  actorUserId: string | null,
  limit = BACKUP_HISTORY_PAGE_LIMIT
): Promise<BackupHistoryEntry[]> {
  await assertPermission(
    client as AuthClient,
    actorUserId,
    PERMISSIONS.BACKUP_VIEW
  );

  const { data, error } = await backupHistoryRepository.listRecentBackupHistory(
    client,
    limit
  );

  if (error) {
    return [];
  }

  return (data ?? []).map(backupHistoryRepository.mapBackupHistoryRow);
}
