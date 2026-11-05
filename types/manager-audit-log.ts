import type {
  AuditLogActionValue,
  AuditLogSeverityValue,
} from "@/lib/constants/manager-audit-log-display";
import type { FieldErrors } from "@/types/auth";

export type AuditLogJsonValue = Record<string, unknown>;

/** Keyset cursor for paged manager audit log lists. */
export type AuditLogCursor = {
  created_at: string;
  id: string;
};

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

export type DeleteAuditLogsActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  deleted_ids?: string[];
};
