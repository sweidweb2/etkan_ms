import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const AUDIT_LOG_COLUMNS =
  "id, user_id, user_label, action, severity, table_name, record_id, old_data, new_data, metadata, created_at";

export const DEFAULT_STUDENT_ACTIVITY_LIMIT = 50;

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

export async function listAuditLogs(client: Supabase) {
  return client
    .from("audit_logs")
    .select(AUDIT_LOG_COLUMNS)
    .order("created_at", { ascending: false });
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
