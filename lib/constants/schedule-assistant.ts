/** Prompt max length for schedule assistant UI + Zod. */
export const SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH = 300;

export const SCHEDULE_ASSISTANT_DEFAULT_MODEL =
  "@cf/nvidia/nemotron-3-120b-a12b";

export const SCHEDULE_ASSISTANT_MAX_TOOL_ROUNDS = 3;

export const SCHEDULE_ASSISTANT_RATE_LIMIT_PER_MINUTE = 10;

export const SCHEDULE_ASSISTANT_TOOL_NAMES = {
  SEARCH_INSTRUCTORS_BY_SUBJECT: "search_instructors_by_subject",
  LIST_FREE_SLOTS_FOR_INSTRUCTORS: "list_free_slots_for_instructors",
} as const;

export type ScheduleAssistantToolName =
  (typeof SCHEDULE_ASSISTANT_TOOL_NAMES)[keyof typeof SCHEDULE_ASSISTANT_TOOL_NAMES];

export const SCHEDULE_ASSISTANT_WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type ScheduleAssistantWeekday =
  (typeof SCHEDULE_ASSISTANT_WEEKDAYS)[number];

export const SCHEDULE_ASSISTANT_REFUSAL_MESSAGE =
  'I can only help find instructors by subject capability and free schedule slots. Try something like: "Arduino instructors free on Tuesday and Friday."';
