import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditLogCursor } from "@/types/manager-audit-log";
import type { Database, Json } from "@/types/supabase";

export type { AuditLogCursor };

type Supabase = SupabaseClient<Database>;

/** Full row (create, find-by-id, student activity). */
const AUDIT_LOG_COLUMNS =
  "id, user_id, user_label, action, severity, table_name, record_id, old_data, new_data, metadata, created_at";

/** Manager list — omit fat JSON blobs; details load them by id. */
const AUDIT_LOG_LIST_COLUMNS =
  "id, user_id, user_label, action, severity, table_name, record_id, metadata, created_at";

export const DEFAULT_STUDENT_ACTIVITY_LIMIT = 50;
export const DEFAULT_MANAGER_AUDIT_LOG_LIMIT = 100;

export type AuditLogRecord = {
  id: string;
  user_id: string | null;
  user_label: string;
  action: string;
  severity: string;
  table_name: string | null;
  record_id: string | null;
  old_data: Json | null;
  new_data: Json | null;
  metadata: Json | null;
  created_at: string;
};

/** List row without old_data / new_data. */
export type AuditLogListRecord = Omit<AuditLogRecord, "old_data" | "new_data">;

export type CreateAuditLogRecordInput = {
  user_id?: string | null;
  user_label: string;
  action: string;
  severity?: string;
  table_name?: string | null;
  record_id?: string | null;
  old_data?: Json | null;
  new_data?: Json | null;
  metadata?: Json | null;
};

/** Related rows keyed by audit `table_name` for `(table_name, record_id)` expand. */
export type AuditRelatedRecordGroup = {
  tableName: string;
  recordIds: string[];
};

export type ListAuditLogsRelatedToStudentInput = {
  studentUserId: string;
  relatedByTable?: AuditRelatedRecordGroup[];
  limit?: number;
};

/**
 * Builds a PostgREST `.or()` filter for student-scoped audit logs:
 * JSON student/user keys plus optional `(table_name, record_id)` groups.
 */
export function buildStudentAuditLogsOrFilter(
  input: ListAuditLogsRelatedToStudentInput
): string {
  const id = input.studentUserId;
  const parts = [
    `metadata->>student_id.eq.${id}`,
    `new_data->>student_id.eq.${id}`,
    `old_data->>student_id.eq.${id}`,
    `new_data->>user_id.eq.${id}`,
    `old_data->>user_id.eq.${id}`,
  ];

  for (const group of input.relatedByTable ?? []) {
    if (group.recordIds.length === 0) {
      continue;
    }
    parts.push(
      `and(table_name.eq.${group.tableName},record_id.in.(${group.recordIds.join(",")}))`
    );
  }

  return parts.join(",");
}

export type ListAuditLogsPageOptions = {
  limit?: number;
  cursor?: AuditLogCursor | null;
};

export async function listAuditLogs(
  client: Supabase,
  options?: { limit?: number; slim?: boolean }
) {
  const columns = options?.slim ? AUDIT_LOG_LIST_COLUMNS : AUDIT_LOG_COLUMNS;
  let query = client
    .from("audit_logs")
    .select(columns)
    .order("created_at", { ascending: false });

  if (options?.limit != null) {
    query = query.limit(options.limit);
  }

  return query;
}

export async function listAuditLogsPage(
  client: Supabase,
  options: ListAuditLogsPageOptions = {}
) {
  const limit = options.limit ?? DEFAULT_MANAGER_AUDIT_LOG_LIMIT;

  let query = client
    .from("audit_logs")
    .select(AUDIT_LOG_LIST_COLUMNS)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  const cursor = options.cursor;
  if (cursor?.created_at && cursor.id) {
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`
    );
  }

  return query;
}

export async function listAuditLogsRelatedToStudent(
  client: Supabase,
  input: ListAuditLogsRelatedToStudentInput
) {
  const limit = input.limit ?? DEFAULT_STUDENT_ACTIVITY_LIMIT;
  const orFilter = buildStudentAuditLogsOrFilter(input);

  return client
    .from("audit_logs")
    .select(AUDIT_LOG_COLUMNS)
    .or(orFilter)
    .order("created_at", { ascending: false })
    .limit(limit);
}

export async function findAuditLogById(client: Supabase, id: string) {
  return client
    .from("audit_logs")
    .select(AUDIT_LOG_COLUMNS)
    .eq("id", id)
    .maybeSingle();
}

export async function deleteAuditLogsByIds(client: Supabase, ids: string[]) {
  return client.from("audit_logs").delete().in("id", ids).select("id");
}

export async function createAuditLog(
  client: Supabase,
  input: CreateAuditLogRecordInput
) {
  return client
    .from("audit_logs")
    .insert({
      user_id: input.user_id ?? null,
      user_label: input.user_label,
      action: input.action,
      severity: input.severity ?? "info",
      table_name: input.table_name ?? null,
      record_id: input.record_id ?? null,
      old_data: input.old_data ?? null,
      new_data: input.new_data ?? null,
      metadata: input.metadata ?? null,
    })
    .select(AUDIT_LOG_COLUMNS)
    .single();
}
