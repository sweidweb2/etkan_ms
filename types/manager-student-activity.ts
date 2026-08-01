import type {
  AuditLogActionValue,
  AuditLogSeverityValue,
} from "@/lib/constants/manager-audit-log-display";
import type { ManagerAuditLogRow } from "@/types/manager-audit-log";

/** Activity timeline row for manager student detail / student portal. */
export type ManagerStudentActivityRow = {
  id: string;
  created_at: string;
  action: AuditLogActionValue;
  severity: AuditLogSeverityValue;
  table_name: string | null;
  actor_label: string;
  summary: string;
  /** Full audit row for optional details dialog. */
  log: ManagerAuditLogRow;
};
