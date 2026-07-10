import type {
  AuditLogActionValue,
  AuditLogSeverityValue,
} from "@/lib/constants/manager-audit-log-display";

export type AuditLogJsonValue = Record<string, unknown>;

export interface ManagerAuditLogRow {
  id: string;
  user_id: string | null;
  user_label: string;
  action: AuditLogActionValue;
  severity: AuditLogSeverityValue;
  table_name: string | null;
  record_id: string | null;
  old_data: AuditLogJsonValue | null;
  new_data: AuditLogJsonValue | null;
  metadata: AuditLogJsonValue | null;
  created_at: string;
}
