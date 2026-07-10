import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const AUDIT_LOG_COLUMNS =
  "id, user_id, user_label, action, severity, table_name, record_id, old_data, new_data, metadata, created_at";

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

export async function listAuditLogs(client: Supabase) {
  return client
    .from("audit_logs")
    .select(AUDIT_LOG_COLUMNS)
    .order("created_at", { ascending: false });
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
