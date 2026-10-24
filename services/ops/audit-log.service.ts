import "server-only";

import { PERMISSIONS } from "@/lib/constants/permissions";
import { scheduleAfterResponse } from "@/lib/ops/schedule-after-response";
import { assertPermission } from "@/services/auth/authorization.service";
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
import type { RoleValue } from "@/lib/constants/roles";
import type { Database, Json } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

export type AuditActor = {
  userId: string | null;
  userLabel: string;
  /** Present for session-backed actors; omitted in tests / system callers. */
  role?: RoleValue | null;
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

function mapAuditLogListRecordToRow(
  record: auditLogRepository.AuditLogListRecord
): ManagerAuditLogRow {
  return {
    id: record.id,
    user_id: record.user_id,
    user_label: record.user_label,
    action: isAuditLogAction(record.action) ? record.action : "other",
    severity: isAuditLogSeverity(record.severity) ? record.severity : "info",
    table_name: record.table_name,
    record_id: record.record_id,
    old_data: null,
    new_data: null,
    metadata: toJsonObject(record.metadata),
    created_at: record.created_at,
  };
}

function mapAuditLogRecordToRow(record: AuditLogRecord): ManagerAuditLogRow {
  return {
    id: record.id,
    user_id: record.user_id,
    user_label: record.user_label,
    action: isAuditLogAction(record.action) ? record.action : "other",
    severity: isAuditLogSeverity(record.severity) ? record.severity : "info",
    table_name: record.table_name,
    record_id: record.record_id,
    old_data: toJsonObject(record.old_data),
    new_data: toJsonObject(record.new_data),
    metadata: toJsonObject(record.metadata),
    created_at: record.created_at,
  };
}

export type ManagerAuditLogsPage = {
  logs: ManagerAuditLogRow[];
  nextCursor: auditLogRepository.AuditLogCursor | null;
};

export async function listAuditLogsForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  options?: {
    limit?: number;
    cursor?: auditLogRepository.AuditLogCursor | null;
  }
): Promise<ManagerAuditLogsPage> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.LOGS_VIEW);

  const limit =
    options?.limit ?? auditLogRepository.DEFAULT_MANAGER_AUDIT_LOG_LIMIT;

  const { data, error } = await auditLogRepository.listAuditLogsPage(
    adminClient,
    {
      limit,
      cursor: options?.cursor ?? null,
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as auditLogRepository.AuditLogListRecord[];
  const logs = rows.map(mapAuditLogListRecordToRow);
  const last = rows.at(-1);

  return {
    logs,
    nextCursor:
      rows.length >= limit && last
        ? { created_at: last.created_at, id: last.id }
        : null,
  };
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

function buildCreateAuditLogInput(
  actor: AuditActor,
  entry: AuditLogEntry
): CreateAuditLogInput {
  return {
    user_id: actor.userId,
    user_label: actor.userLabel.trim() || "System",
    action: entry.action,
    severity: entry.severity ?? "info",
    table_name: entry.table_name ?? null,
    record_id: entry.record_id ?? null,
    old_data: entry.old_data ?? null,
    new_data: entry.new_data ?? null,
    metadata: entry.metadata ?? null,
  };
}

async function persistManagerAuditLog(
  adminClient: Supabase,
  input: CreateAuditLogInput
): Promise<ManagerAuditLogRow | null> {
  try {
    const row = await createAuditLogForManager(adminClient, input);
    if (!row) {
      console.error("[audit] manager audit log insert returned null", {
        action: input.action,
        table_name: input.table_name,
        record_id: input.record_id,
      });
    }
    return row;
  } catch (error) {
    console.error("[audit] manager audit log insert threw", error);
    return null;
  }
}

/**
 * Records an audit log after a successful mutation.
 * Never throws — audit failures must not fail the parent use case.
 *
 * When Next.js `after()` is available, the insert is deferred until after the
 * response is sent so mutations do not pay an extra REST round trip on the
 * critical path. Falls back to an awaited insert in tests and non-Next runtimes.
 */
export async function recordManagerAuditLog(
  adminClient: Supabase,
  actor: AuditActor,
  entry: AuditLogEntry
): Promise<ManagerAuditLogRow | null> {
  const input = buildCreateAuditLogInput(actor, entry);
  const write = async () => {
    await persistManagerAuditLog(adminClient, input);
  };

  if (scheduleAfterResponse(write)) {
    return null;
  }

  return persistManagerAuditLog(adminClient, input);
}
