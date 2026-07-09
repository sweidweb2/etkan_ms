export const CLASS_STATUSES = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  DONE: "done",
  PAUSED: "paused",
  STOPPED: "stopped",
} as const;

export type ClassStatusValue =
  (typeof CLASS_STATUSES)[keyof typeof CLASS_STATUSES];

export const CLASS_STATUS_VALUES = Object.values(CLASS_STATUSES);

export function getPreviewClassStatus(seed: number): ClassStatusValue {
  return CLASS_STATUS_VALUES[Math.abs(seed) % CLASS_STATUS_VALUES.length]!;
}
