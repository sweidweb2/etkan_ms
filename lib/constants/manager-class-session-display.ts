import type { SessionTimingLabel } from "@/types/manager-class-session";

export const CLASS_SESSION_CARD_LIMITS = {
  topic: 40,
} as const;

export const SESSION_TIMING_LABELS: Record<SessionTimingLabel, string> = {
  upcoming: "Upcoming",
  in_progress: "In progress",
  completed: "Completed",
};

export const SESSION_TIMING_BADGE_CLASSES: Record<SessionTimingLabel, string> = {
  upcoming: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  in_progress: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  completed: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};
