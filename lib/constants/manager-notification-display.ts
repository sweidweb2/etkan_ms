export const NOTIFICATION_AUDIENCE_VALUES = [
  "admin",
  "manager",
  "co-manager",
  "ceo",
  "supervisor",
  "teacher",
  "trainer",
  "student",
  "all",
] as const;

export const NOTIFICATION_CATEGORY_VALUES = [
  "system",
  "academic",
  "billing",
  "equipment",
  "attendance",
  "general",
] as const;

export const NOTIFICATION_PRIORITY_VALUES = ["low", "normal", "high"] as const;

export type NotificationAudienceValue =
  (typeof NOTIFICATION_AUDIENCE_VALUES)[number];

export type NotificationCategoryValue =
  (typeof NOTIFICATION_CATEGORY_VALUES)[number];

export type NotificationPriorityValue =
  (typeof NOTIFICATION_PRIORITY_VALUES)[number];

export const NOTIFICATION_AUDIENCE_LABELS: Record<
  NotificationAudienceValue,
  string
> = {
  admin: "Admin",
  manager: "Manager",
  "co-manager": "Co-manager",
  ceo: "CEO",
  supervisor: "Supervisor",
  teacher: "Teacher",
  trainer: "Trainer",
  student: "Student",
  all: "Everyone",
};

export const NOTIFICATION_CATEGORY_LABELS: Record<
  NotificationCategoryValue,
  string
> = {
  system: "System",
  academic: "Academic",
  billing: "Billing",
  equipment: "Equipment",
  attendance: "Attendance",
  general: "General",
};

export const NOTIFICATION_CATEGORY_BADGE_CLASSES: Record<
  NotificationCategoryValue,
  string
> = {
  system: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  academic: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  billing: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  equipment: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  attendance: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  general: "bg-muted text-muted-foreground",
};

export const NOTIFICATION_PRIORITY_LABELS: Record<
  NotificationPriorityValue,
  string
> = {
  low: "Low",
  normal: "Normal",
  high: "High",
};

export const NOTIFICATION_PRIORITY_BADGE_CLASSES: Record<
  NotificationPriorityValue,
  string
> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-muted text-muted-foreground",
  high: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};
