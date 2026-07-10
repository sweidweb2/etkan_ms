export const AUDIT_LOG_ACTION_VALUES = [
  "insert",
  "update",
  "delete",
  "login",
  "logout",
  "export",
  "other",
] as const;

export type AuditLogActionValue = (typeof AUDIT_LOG_ACTION_VALUES)[number];

export const AUDIT_LOG_ACTION_LABELS: Record<AuditLogActionValue, string> = {
  insert: "Insert",
  update: "Update",
  delete: "Delete",
  login: "Login",
  logout: "Logout",
  export: "Export",
  other: "Other",
};

export const AUDIT_LOG_ACTION_BADGE_CLASSES: Record<AuditLogActionValue, string> = {
  insert: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  update: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  delete: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  login: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  logout: "bg-muted text-muted-foreground",
  export: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  other: "bg-muted text-muted-foreground",
};

export const AUDIT_LOG_SEVERITY_VALUES = [
  "info",
  "warning",
  "critical",
] as const;

export type AuditLogSeverityValue = (typeof AUDIT_LOG_SEVERITY_VALUES)[number];

export const AUDIT_LOG_SEVERITY_LABELS: Record<AuditLogSeverityValue, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

export const AUDIT_LOG_SEVERITY_BADGE_CLASSES: Record<
  AuditLogSeverityValue,
  string
> = {
  info: "bg-muted text-muted-foreground",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  critical: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};
