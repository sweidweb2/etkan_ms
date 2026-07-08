import {
  AUDIT_LOG_ACTION_BADGE_CLASSES,
  AUDIT_LOG_ACTION_LABELS,
  type AuditLogActionValue,
} from "@/lib/constants/manager-audit-log-display";
import { cn } from "@/lib/utils";

type AuditLogActionBadgeProps = {
  action: AuditLogActionValue;
  className?: string;
};

export function AuditLogActionBadge({ action, className }: AuditLogActionBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        AUDIT_LOG_ACTION_BADGE_CLASSES[action],
        className
      )}
    >
      {AUDIT_LOG_ACTION_LABELS[action]}
    </span>
  );
}
