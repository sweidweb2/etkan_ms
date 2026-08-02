export const WORKSHOP_STATUSES = {
  DRAFT: "draft",
  PROPOSAL: "proposal",
  SCHEDULED: "scheduled",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type WorkshopStatusValue =
  (typeof WORKSHOP_STATUSES)[keyof typeof WORKSHOP_STATUSES];

export const WORKSHOP_STATUS_VALUES = Object.values(WORKSHOP_STATUSES);

/** Linear lifecycle checkpoints (excludes cancelled). */
export const WORKSHOP_STATUS_FLOW = [
  WORKSHOP_STATUSES.DRAFT,
  WORKSHOP_STATUSES.PROPOSAL,
  WORKSHOP_STATUSES.SCHEDULED,
  WORKSHOP_STATUSES.IN_PROGRESS,
  WORKSHOP_STATUSES.COMPLETED,
] as const satisfies readonly WorkshopStatusValue[];

export type WorkshopStatusFlowValue = (typeof WORKSHOP_STATUS_FLOW)[number];

export const WORKSHOP_STATUS_CANCELLED = WORKSHOP_STATUSES.CANCELLED;
