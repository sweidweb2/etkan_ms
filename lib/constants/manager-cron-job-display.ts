import type {
  CronJobFrequencyValue,
  CronJobStatusValue,
} from "@/types/manager-cron-job";

export const CRON_JOB_TABLE_LIMITS = {
  jobName: 28,
  schedule: 18,
  summary: 48,
  tables: 32,
  frequency: 12,
} as const;

export const CRON_JOB_FREQUENCY_LABELS: Record<CronJobFrequencyValue, string> = {
  daily: "Daily",
  weekly: "Weekly",
  hourly: "Hourly",
  other: "Other",
};

export const CRON_JOB_STATUS_LABELS: Record<CronJobStatusValue, string> = {
  active: "Active",
};

export const CRON_JOB_STATUS_BADGE_CLASSES: Record<CronJobStatusValue, string> =
  {
    active: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  };
