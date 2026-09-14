export const EXERCISE_STATUSES = {
  DRAFT: "draft",
  ACTIVE: "active",
  ARCHIVED: "archived",
} as const;

export const EXERCISE_STATUS_VALUES = [
  EXERCISE_STATUSES.DRAFT,
  EXERCISE_STATUSES.ACTIVE,
  EXERCISE_STATUSES.ARCHIVED,
] as const;

export type ExerciseStatusValue = (typeof EXERCISE_STATUS_VALUES)[number];

export const EXERCISE_STATUS_LABELS: Record<ExerciseStatusValue, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};
