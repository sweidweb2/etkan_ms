import { AUDIT_LOG_ACTION_LABELS } from "@/lib/constants/manager-audit-log-display";
import type { ManagerAuditLogRow } from "@/types/manager-audit-log";

/**
 * Prefer `metadata.note` for student activity; otherwise a short synthetic summary
 * (same ideas as the manage-logs panel).
 */
export function getAuditLogChangeSummary(log: ManagerAuditLogRow): string {
  if (typeof log.metadata?.note === "string" && log.metadata.note.trim()) {
    return log.metadata.note;
  }

  const changedFields = log.metadata?.changed_fields;
  if (Array.isArray(changedFields) && changedFields.length > 0) {
    const fields = changedFields
      .filter((field): field is string => typeof field === "string")
      .join(", ");
    return `Updated fields: ${fields}`;
  }

  if (log.action === "insert" && log.new_data) {
    const keys = Object.keys(log.new_data);
    return `Inserted record with ${keys.length} field(s)`;
  }

  if (log.action === "delete") {
    return `Deleted record from ${log.table_name ?? "table"}`;
  }

  if (log.action === "export" && log.new_data) {
    const fileName = log.new_data.file_name;
    if (typeof fileName === "string") {
      return `Exported ${fileName}`;
    }
    return "Export completed";
  }

  if (log.action === "login" || log.action === "logout") {
    return `${AUDIT_LOG_ACTION_LABELS[log.action]} event`;
  }

  return AUDIT_LOG_ACTION_LABELS[log.action];
}
