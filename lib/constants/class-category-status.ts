export const CLASS_CATEGORY_STATUSES = {
  IN_PROGRESS: "in_progress",
  DONE: "done",
} as const;

export const CLASS_CATEGORY_STATUS_VALUES = [
  CLASS_CATEGORY_STATUSES.IN_PROGRESS,
  CLASS_CATEGORY_STATUSES.DONE,
] as const;

export type ClassCategoryStatusValue =
  (typeof CLASS_CATEGORY_STATUS_VALUES)[number];

export const CLASS_CATEGORY_STATUS_LABELS: Record<
  ClassCategoryStatusValue,
  string
> = {
  in_progress: "In progress",
  done: "Done",
};
