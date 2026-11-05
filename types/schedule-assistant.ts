export type ScheduleAssistantSseEvent =
  | { type: "reasoning"; text: string }
  | { type: "tool_start"; name: string; args?: unknown }
  | { type: "tool_result"; name: string; summary: string }
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "refused"; message: string };

/** Compact instructor: id + full name. */
export type ScheduleAssistantCompactInstructor = {
  i: string;
  u: string;
};

/** Capability matrix row: instructor id + full name → subject names. */
export type ScheduleAssistantCompactMatrixRow = {
  i: string;
  u: string;
  sub: string[];
};

/** Name phrase that matched more than one catalog instructor. */
export type ScheduleAssistantInstructorAmbiguity = {
  phrase: string;
  candidates: ScheduleAssistantCompactInstructor[];
};

/** Compact free slot: instructor id + full name + window. */
export type ScheduleAssistantCompactSlot = {
  i: string;
  u: string;
  d: string;
  w: string;
  s: string;
  e: string;
};

export type ScheduleAssistantCatalogMeta = {
  truncated: boolean;
  total: number;
};

export type ScheduleAssistantInstructorsCatalog =
  ScheduleAssistantCatalogMeta & {
    instructors: ScheduleAssistantCompactInstructor[];
  };

export type ScheduleAssistantSubjectsCatalog = ScheduleAssistantCatalogMeta & {
  subjects: string[];
};

export type ScheduleAssistantMatrixCatalog = ScheduleAssistantCatalogMeta & {
  matrix: ScheduleAssistantCompactMatrixRow[];
};

export type ScheduleAssistantSlotsCatalog = ScheduleAssistantCatalogMeta & {
  slots: ScheduleAssistantCompactSlot[];
};

/** Prefetch bundle keyed by active route needs. */
export type ScheduleAssistantPrefetchCatalogs = {
  instructors?: ScheduleAssistantInstructorsCatalog;
  subjects?: ScheduleAssistantSubjectsCatalog;
  matrix?: ScheduleAssistantMatrixCatalog;
  slots?: ScheduleAssistantSlotsCatalog;
};
