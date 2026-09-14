export const EXERCISE_LEVELS = {
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
} as const;

export const EXERCISE_LEVEL_VALUES = [
  EXERCISE_LEVELS.EASY,
  EXERCISE_LEVELS.MEDIUM,
  EXERCISE_LEVELS.HARD,
] as const;

export type ExerciseLevelValue = (typeof EXERCISE_LEVEL_VALUES)[number];

export const EXERCISE_LEVEL_LABELS: Record<ExerciseLevelValue, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};
