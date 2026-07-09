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

export const SESSION_GROUP_GRADE_LEVEL_TOGGLE_CLASSES: Record<
  SessionGroupGradeLevelValue,
  string
> = {
  very_low:
    "border-rose-500/30 bg-rose-500/8 text-rose-700/80 dark:text-rose-400/80 hover:border-rose-500/45 hover:bg-rose-500/12 data-[state=on]:border-rose-500 data-[state=on]:bg-rose-500/20 data-[state=on]:text-rose-800 data-[state=on]:shadow-sm dark:data-[state=on]:text-rose-300",
  low: "border-orange-500/30 bg-orange-500/8 text-orange-700/80 dark:text-orange-400/80 hover:border-orange-500/45 hover:bg-orange-500/12 data-[state=on]:border-orange-500 data-[state=on]:bg-orange-500/20 data-[state=on]:text-orange-800 data-[state=on]:shadow-sm dark:data-[state=on]:text-orange-300",
  medium:
    "border-amber-500/30 bg-amber-500/8 text-amber-700/80 dark:text-amber-400/80 hover:border-amber-500/45 hover:bg-amber-500/12 data-[state=on]:border-amber-500 data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-800 data-[state=on]:shadow-sm dark:data-[state=on]:text-amber-300",
  high: "border-emerald-500/30 bg-emerald-500/8 text-emerald-700/80 dark:text-emerald-400/80 hover:border-emerald-500/45 hover:bg-emerald-500/12 data-[state=on]:border-emerald-500 data-[state=on]:bg-emerald-500/20 data-[state=on]:text-emerald-800 data-[state=on]:shadow-sm dark:data-[state=on]:text-emerald-300",
  very_high:
    "border-violet-500/30 bg-violet-500/8 text-violet-700/80 dark:text-violet-400/80 hover:border-violet-500/45 hover:bg-violet-500/12 data-[state=on]:border-violet-500 data-[state=on]:bg-violet-500/20 data-[state=on]:text-violet-800 data-[state=on]:shadow-sm dark:data-[state=on]:text-violet-300",
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
