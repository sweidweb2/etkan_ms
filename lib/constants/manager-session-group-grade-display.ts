import {
  SESSION_GROUP_GRADE_LEVELS,
  type SessionGroupGradeLevelValue,
} from "@/types/manager-session-group-grade";

export const SESSION_GROUP_GRADE_LEVEL_ORDER: SessionGroupGradeLevelValue[] = [
  SESSION_GROUP_GRADE_LEVELS.VERY_LOW,
  SESSION_GROUP_GRADE_LEVELS.LOW,
  SESSION_GROUP_GRADE_LEVELS.MEDIUM,
  SESSION_GROUP_GRADE_LEVELS.HIGH,
  SESSION_GROUP_GRADE_LEVELS.VERY_HIGH,
];

export const SESSION_GROUP_GRADE_LEVEL_LABELS: Record<
  SessionGroupGradeLevelValue,
  string
> = {
  very_low: "Very low",
  low: "Low",
  medium: "Medium",
  high: "High",
  very_high: "Very high",
};

/** Muted secondary look for unselected level toggles. */
export const SESSION_GROUP_GRADE_LEVEL_TOGGLE_OFF_CLASSES: Record<
  SessionGroupGradeLevelValue,
  string
> = {
  very_low:
    "border-border/80 bg-muted/40 text-muted-foreground hover:border-rose-500/25 hover:bg-muted/55",
  low: "border-border/80 bg-muted/40 text-muted-foreground hover:border-orange-500/25 hover:bg-muted/55",
  medium:
    "border-border/80 bg-muted/40 text-muted-foreground hover:border-amber-500/25 hover:bg-muted/55",
  high: "border-border/80 bg-muted/40 text-muted-foreground hover:border-emerald-500/25 hover:bg-muted/55",
  very_high:
    "border-border/80 bg-muted/40 text-muted-foreground hover:border-violet-500/25 hover:bg-muted/55",
};

/** Bold level-themed look for the selected toggle. */
export const SESSION_GROUP_GRADE_LEVEL_TOGGLE_ON_CLASSES: Record<
  SessionGroupGradeLevelValue,
  string
> = {
  very_low:
    "border-rose-500 bg-rose-500/20 text-rose-800 shadow-sm ring-1 ring-rose-500/35 dark:text-rose-200",
  low: "border-orange-500 bg-orange-500/20 text-orange-800 shadow-sm ring-1 ring-orange-500/35 dark:text-orange-200",
  medium:
    "border-amber-500 bg-amber-500/20 text-amber-900 shadow-sm ring-1 ring-amber-500/35 dark:text-amber-200",
  high: "border-emerald-500 bg-emerald-500/20 text-emerald-800 shadow-sm ring-1 ring-emerald-500/35 dark:text-emerald-200",
  very_high:
    "border-violet-500 bg-violet-500/20 text-violet-800 shadow-sm ring-1 ring-violet-500/35 dark:text-violet-200",
};

export const SESSION_GROUP_GRADE_LEVEL_DOT_CLASSES: Record<
  SessionGroupGradeLevelValue,
  string
> = {
  very_low: "bg-rose-500",
  low: "bg-orange-500",
  medium: "bg-amber-500",
  high: "bg-emerald-500",
  very_high: "bg-violet-500",
};
