export const TEAM_STATUSES = {
  SCHEDULED: "scheduled",
  STARTED: "started",
  CANCELLED: "cancelled",
} as const;

export type TeamStatus = (typeof TEAM_STATUSES)[keyof typeof TEAM_STATUSES];

export const TEAM_STATUS_VALUES = [
  TEAM_STATUSES.SCHEDULED,
  TEAM_STATUSES.STARTED,
  TEAM_STATUSES.CANCELLED,
] as const;

export const TEAM_DEFAULT_STATUS = TEAM_STATUSES.SCHEDULED;

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  scheduled: "Scheduled",
  started: "Started",
  cancelled: "Cancelled",
};

export const TEAM_STATUS_BADGE_CLASSES: Record<TeamStatus, string> = {
  scheduled:
    "bg-violet-500/15 text-violet-700 ring-violet-500/25 dark:text-violet-400",
  started:
    "bg-emerald-500/15 text-emerald-700 ring-emerald-500/25 dark:text-emerald-400",
  cancelled:
    "bg-amber-500/15 text-amber-700 ring-amber-500/25 dark:text-amber-400",
};

export const TEAM_NAME_MAX = 120;

export function isTeamStatus(value: string): value is TeamStatus {
  return (TEAM_STATUS_VALUES as readonly string[]).includes(value);
}
