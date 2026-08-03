/** Prompt max length for schedule assistant UI + Zod. */
export const SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH = 300;

export const SCHEDULE_ASSISTANT_DEFAULT_MODEL =
  "@cf/nvidia/nemotron-3-120b-a12b";

export const SCHEDULE_ASSISTANT_RATE_LIMIT_PER_MINUTE = 10;

/** Catalog / answer caps for the upcoming 3-router pipeline. */
export const SCHEDULE_ASSISTANT_MAX_INSTRUCTORS = 30;
export const SCHEDULE_ASSISTANT_MAX_SLOTS = 40;

/** LLM-1 router classify call (reasoning models need headroom before JSON content). */
export const SCHEDULE_ASSISTANT_ROUTER_MAX_TOKENS = 280;

/** LLM-2 mapper call (closed-world groups JSON). */
export const SCHEDULE_ASSISTANT_MAPPER_MAX_TOKENS = 420;

/** Optional answer synth (Phase 5); default path uses deterministic formatter. */
export const SCHEDULE_ASSISTANT_SYNTH_MAX_TOKENS = 160;

export const SCHEDULE_ASSISTANT_NO_MATCH_MESSAGE =
  "No matching instructors or free slots were found.";

export const SCHEDULE_ASSISTANT_ROUTES = [
  "capabilities",
  "availability",
  "capability_availability",
  "refuse",
] as const;

export type ScheduleAssistantRoute =
  (typeof SCHEDULE_ASSISTANT_ROUTES)[number];

/** In-scope routes that prefetch catalogs (excludes refuse). */
export const SCHEDULE_ASSISTANT_ACTIVE_ROUTES = [
  "capabilities",
  "availability",
  "capability_availability",
] as const;

export type ScheduleAssistantActiveRoute =
  (typeof SCHEDULE_ASSISTANT_ACTIVE_ROUTES)[number];

export const SCHEDULE_ASSISTANT_CAPABILITY_DIRECTIONS = [
  "username_to_capability",
  "capability_to_username",
] as const;

export type ScheduleAssistantCapabilityDirection =
  (typeof SCHEDULE_ASSISTANT_CAPABILITY_DIRECTIONS)[number];

export const SCHEDULE_ASSISTANT_AVAILABILITY_DIRECTIONS = [
  "username_to_slots",
  "slots_to_username",
] as const;

export type ScheduleAssistantAvailabilityDirection =
  (typeof SCHEDULE_ASSISTANT_AVAILABILITY_DIRECTIONS)[number];

export const SCHEDULE_ASSISTANT_JOIN_DIRECTIONS = [
  "subject_and_availability",
] as const;

export type ScheduleAssistantJoinDirection =
  (typeof SCHEDULE_ASSISTANT_JOIN_DIRECTIONS)[number];

export const SCHEDULE_ASSISTANT_GROUP_DIRECTIONS = [
  ...SCHEDULE_ASSISTANT_CAPABILITY_DIRECTIONS,
  ...SCHEDULE_ASSISTANT_AVAILABILITY_DIRECTIONS,
  ...SCHEDULE_ASSISTANT_JOIN_DIRECTIONS,
] as const;

export type ScheduleAssistantGroupDirection =
  (typeof SCHEDULE_ASSISTANT_GROUP_DIRECTIONS)[number];

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
  'I only help with instructor capabilities and free schedule slots. Try: "Arduino instructors free Tuesday."';
