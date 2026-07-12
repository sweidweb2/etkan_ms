import type { SemesterStatusValue } from "@/lib/constants/manager-semester-status";

export const PHASE_CARD_LIMITS = {
  name: 42,
} as const;

export const MANAGER_SEMESTER_STATUS_LABELS: Record<SemesterStatusValue, string> =
  {
    scheduled: "Scheduled",
    in_progress: "In progress",
    stopped: "Stopped",
    paused: "Paused",
    done: "Done",
  };

export const MANAGER_SEMESTER_STATUS_BADGE_CLASSES: Record<
  SemesterStatusValue,
  string
> = {
  scheduled: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  in_progress: "bg-sky-500/15 text-sky-700 dark:text-sky-400",
  stopped: "bg-rose-500/15 text-rose-700 dark:text-rose-400",
  paused: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  done: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};
