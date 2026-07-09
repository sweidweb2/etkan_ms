import type { ClassStatusValue } from "@/lib/constants/manager-class-status";

export const MANAGER_CLASS_CARD_LIMITS = {
  name: 28,
  subjectName: 24,
  semesterName: 26,
  id: 14,
} as const;

export const MANAGER_CLASS_STATUS_LABELS: Record<ClassStatusValue, string> = {
  scheduled: "Scheduled",
  in_progress: "In progress",
  done: "Done",
  paused: "Paused",
  stopped: "Stopped",
};

export const MANAGER_CLASS_STATUS_BADGE_CLASSES: Record<ClassStatusValue, string> = {
  scheduled: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  in_progress: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  stopped: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
};

export const MANAGER_CLASS_STATUS_DOT_CLASSES: Record<ClassStatusValue, string> = {
  scheduled: "bg-violet-500",
  in_progress: "bg-sky-500",
  done: "bg-emerald-500",
  paused: "bg-amber-500",
  stopped: "bg-rose-500",
};
