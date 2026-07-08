export const SUBJECT_CARD_LIMITS = {
  name: 32,
  link: 24,
} as const;

export const CLASS_CARD_LIMITS = {
  name: 28,
  id: 12,
} as const;

export const CLASS_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
};

export const CLASS_STATUS_BADGE_CLASSES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  inactive: "bg-muted text-muted-foreground",
};
