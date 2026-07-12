export const SEMESTER_STATUSES = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  STOPPED: "stopped",
  PAUSED: "paused",
  DONE: "done",
} as const;

export type SemesterStatusValue =
  (typeof SEMESTER_STATUSES)[keyof typeof SEMESTER_STATUSES];

export const SEMESTER_STATUS_VALUES = Object.values(SEMESTER_STATUSES) as [
  SemesterStatusValue,
  ...SemesterStatusValue[],
];
