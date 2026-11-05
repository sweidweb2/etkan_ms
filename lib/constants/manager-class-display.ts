import type { ClassStatusValue } from "@/lib/constants/manager-class-status";

export const MANAGER_CLASS_CARD_LIMITS = {
  name: 28,
  subjectName: 24,
  semesterName: 26,
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

/** Left accent on class cards; repeats on hover so card hover borders don't override it. */
export const MANAGER_CLASS_STATUS_BORDER_LEFT_CLASSES: Record<
  ClassStatusValue,
  string
> = {
  scheduled: "border-l-violet-500 hover:border-l-violet-500",
  in_progress: "border-l-sky-500 hover:border-l-sky-500",
  done: "border-l-emerald-500 hover:border-l-emerald-500",
  paused: "border-l-amber-500 hover:border-l-amber-500",
  stopped: "border-l-rose-500 hover:border-l-rose-500",
};

export const MANAGER_CLASS_STATUS_ICON_CLASSES: Record<ClassStatusValue, string> = {
  scheduled: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  in_progress: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  done: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  paused: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  stopped: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

export const MANAGER_CLASS_STATUS_TAB_CLASSES: Record<
  ClassStatusValue,
  { idle: string; active: string }
> = {
  scheduled: {
    idle: "text-violet-700 hover:bg-violet-500/10 dark:text-violet-300",
    active:
      "border-violet-500/40 bg-violet-500/15 text-violet-800 dark:text-violet-200",
  },
  in_progress: {
    idle: "text-sky-700 hover:bg-sky-500/10 dark:text-sky-300",
    active: "border-sky-500/40 bg-sky-500/15 text-sky-800 dark:text-sky-200",
  },
  done: {
    idle: "text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300",
    active:
      "border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
  },
  paused: {
    idle: "text-amber-700 hover:bg-amber-500/10 dark:text-amber-300",
    active:
      "border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200",
  },
  stopped: {
    idle: "text-rose-700 hover:bg-rose-500/10 dark:text-rose-300",
    active: "border-rose-500/40 bg-rose-500/15 text-rose-800 dark:text-rose-200",
  },
};

export const MANAGER_CLASS_STATUS_SECONDARY_BUTTON_CLASSES: Record<
  ClassStatusValue,
  string
> = {
  scheduled:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 hover:bg-violet-500/15 hover:text-violet-800 dark:text-violet-300 dark:hover:text-violet-200",
  in_progress:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 hover:bg-sky-500/15 hover:text-sky-800 dark:text-sky-300 dark:hover:text-sky-200",
  done: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 hover:text-emerald-800 dark:text-emerald-300 dark:hover:text-emerald-200",
  paused:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200",
  stopped:
    "border-rose-500/30 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 hover:text-rose-800 dark:text-rose-300 dark:hover:text-rose-200",
};
