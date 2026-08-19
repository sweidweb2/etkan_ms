import { PERMISSIONS } from "@/lib/constants/permissions";
import { assertPermission } from "@/services/authorization.service";
import {
  AUDIT_LOG_ACTION_VALUES,
  AUDIT_LOG_SEVERITY_VALUES,
  type AuditLogActionValue,
  type AuditLogSeverityValue,
} from "@/lib/constants/manager-audit-log-display";
import * as auditLogRepository from "@/repositories/audit-log.repository";
import type { AuditLogRecord } from "@/repositories/audit-log.repository";
import type {
  AuditLogJsonValue,
  ManagerAuditLogRow,
} from "@/types/manager-audit-log";
import type { Database, Json } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

export type AuditActor = {
  userId: string | null;
  userLabel: string;
};

export type AuditLogEntry = {
  action: AuditLogActionValue;
  severity?: AuditLogSeverityValue;
  table_name?: string | null;
  record_id?: string | null;
  old_data?: AuditLogJsonValue | null;
  new_data?: AuditLogJsonValue | null;
  metadata?: AuditLogJsonValue | null;
};

function isAuditLogAction(value: string): value is AuditLogActionValue {
  return (AUDIT_LOG_ACTION_VALUES as readonly string[]).includes(value);
}

function isAuditLogSeverity(value: string): value is AuditLogSeverityValue {
  return (AUDIT_LOG_SEVERITY_VALUES as readonly string[]).includes(value);
}

function toJsonObject(value: Json | null): AuditLogJsonValue | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as AuditLogJsonValue;
}

function mapAuditLogRecordToRow(
  record: AuditLogRecord | auditLogRepository.AuditLogListRecord
): ManagerAuditLogRow {
  const withBlobs = record as AuditLogRecord;
  return {
    id: record.id,
    user_id: record.user_id,
    user_label: record.user_label,
    action: isAuditLogAction(record.action) ? record.action : "other",
    severity: isAuditLogSeverity(record.severity) ? record.severity : "info",
    table_name: record.table_name,
    record_id: record.record_id,
    old_data: toJsonObject(withBlobs.old_data ?? null),
    new_data: toJsonObject(withBlobs.new_data ?? null),
    metadata: toJsonObject(record.metadata),
    created_at: record.created_at,
  };
}

export async function listAuditLogsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  options?: { limit?: number }
): Promise<ManagerAuditLogRow[]> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.LOGS_VIEW);

  const limit =
    options?.limit ?? auditLogRepository.DEFAULT_MANAGER_AUDIT_LOG_LIMIT;

  const { data, error } = await auditLogRepository.listAuditLogs(adminClient, {
    limit,
    slim: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapAuditLogRecordToRow(
      row as unknown as auditLogRepository.AuditLogListRecord
    )
  );
}

export async function getAuditLogByIdForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  id: string
): Promise<ManagerAuditLogRow | null> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.LOGS_VIEW);

  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }

  const { data, error } = await auditLogRepository.findAuditLogById(
    adminClient,
    trimmed
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapAuditLogRecordToRow(data);
}

export type CreateAuditLogInput = {
  user_id?: string | null;
  user_label: string;
  action: AuditLogActionValue;
  severity?: AuditLogSeverityValue;
  table_name?: string | null;
  record_id?: string | null;
  old_data?: AuditLogJsonValue | null;
  new_data?: AuditLogJsonValue | null;
  metadata?: AuditLogJsonValue | null;
};

export async function createAuditLogForManager(
  adminClient: Supabase,
  input: CreateAuditLogInput
): Promise<ManagerAuditLogRow | null> {
  const { data, error } = await auditLogRepository.createAuditLog(adminClient, {
    user_id: input.user_id ?? null,
    user_label: input.user_label,
    action: input.action,
    severity: input.severity ?? "info",
    table_name: input.table_name ?? null,
    record_id: input.record_id ?? null,
    old_data: (input.old_data ?? null) as Json | null,
    new_data: (input.new_data ?? null) as Json | null,
    metadata: (input.metadata ?? null) as Json | null,
  });

  if (error || !data) {
    return null;
  }

  return mapAuditLogRecordToRow(data);
}

/**
 * Records an audit log after a successful mutation.
 * Never throws — audit failures must not fail the parent use case.
 */
export async function recordManagerAuditLog(
  adminClient: Supabase,
  actor: AuditActor,
  entry: AuditLogEntry
): Promise<ManagerAuditLogRow | null> {
  try {
    return await createAuditLogForManager(adminClient, {
      user_id: actor.userId,
      user_label: actor.userLabel.trim() || "System",
      action: entry.action,
      severity: entry.severity ?? "info",
      table_name: entry.table_name ?? null,
      record_id: entry.record_id ?? null,
      old_data: entry.old_data ?? null,
      new_data: entry.new_data ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch {
    return null;
  }
}
