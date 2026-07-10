import {
  AUDIT_LOG_SEVERITY_BADGE_CLASSES,
  AUDIT_LOG_SEVERITY_LABELS,
  type AuditLogSeverityValue,
} from "@/lib/constants/manager-audit-log-display";
import { cn } from "@/lib/utils";

type AuditLogSeverityBadgeProps = {
  severity: AuditLogSeverityValue;
  className?: string;
};

export function AuditLogSeverityBadge({
  severity,
  className,
}: AuditLogSeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        AUDIT_LOG_SEVERITY_BADGE_CLASSES[severity],
        className
      )}
    >
      {AUDIT_LOG_SEVERITY_LABELS[severity]}
    </span>
  );
}
