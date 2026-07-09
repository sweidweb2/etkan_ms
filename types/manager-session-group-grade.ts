export const SESSION_GROUP_GRADE_LEVELS = {
  VERY_LOW: "very_low",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  VERY_HIGH: "very_high",
} as const;

export type SessionGroupGradeLevelValue =
  (typeof SESSION_GROUP_GRADE_LEVELS)[keyof typeof SESSION_GROUP_GRADE_LEVELS];
