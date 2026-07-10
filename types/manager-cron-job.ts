export const CRON_JOB_FREQUENCIES = {
  DAILY: "daily",
  WEEKLY: "weekly",
  HOURLY: "hourly",
  OTHER: "other",
} as const;

export type CronJobFrequencyValue =
  (typeof CRON_JOB_FREQUENCIES)[keyof typeof CRON_JOB_FREQUENCIES];

export const CRON_JOB_FREQUENCY_VALUES = Object.values(CRON_JOB_FREQUENCIES);

export const CRON_JOB_STATUSES = {
  ACTIVE: "active",
} as const;

export type CronJobStatusValue =
  (typeof CRON_JOB_STATUSES)[keyof typeof CRON_JOB_STATUSES];

export type ManagerCronJobRow = {
  id: string;
  job_name: string;
  schedule: string;
  schedule_label: string;
  frequency: CronJobFrequencyValue;
  status: CronJobStatusValue;
  summary: string;
  description: string;
  function_name: string;
  tables: string[];
  migration: string;
  verify_hint: string;
  manual_run: string;
};
