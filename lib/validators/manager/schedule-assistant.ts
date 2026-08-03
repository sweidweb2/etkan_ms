import { z } from "zod";
import {
  SCHEDULE_ASSISTANT_AVAILABILITY_DIRECTIONS,
  SCHEDULE_ASSISTANT_CAPABILITY_DIRECTIONS,
  SCHEDULE_ASSISTANT_GROUP_DIRECTIONS,
  SCHEDULE_ASSISTANT_JOIN_DIRECTIONS,
  SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH,
  SCHEDULE_ASSISTANT_ROUTES,
  SCHEDULE_ASSISTANT_WEEKDAYS,
} from "@/lib/constants/schedule-assistant";

export const scheduleAssistantPromptSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, { message: "Prompt is required." })
    .max(SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH, {
      message: `Prompt must be at most ${SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH} characters.`,
    }),
});

export type ScheduleAssistantPromptInput = z.infer<
  typeof scheduleAssistantPromptSchema
>;

const tokenListSchema = z.array(z.string().trim().min(1).max(120)).max(20);

export const scheduleAssistantHintsSchema = z.object({
  weekdays: z.array(z.enum(SCHEDULE_ASSISTANT_WEEKDAYS)).max(7).default([]),
  subject_tokens: tokenListSchema.default([]),
  username_tokens: tokenListSchema.default([]),
});

export type ScheduleAssistantHints = z.infer<
  typeof scheduleAssistantHintsSchema
>;

export const scheduleAssistantRouterResultSchema = z.object({
  route: z.enum(SCHEDULE_ASSISTANT_ROUTES),
  hints: scheduleAssistantHintsSchema.default({
    weekdays: [],
    subject_tokens: [],
    username_tokens: [],
  }),
});

export type ScheduleAssistantRouterResult = z.infer<
  typeof scheduleAssistantRouterResultSchema
>;

const hhMmSchema = z
  .string()
  .trim()
  .regex(/^\d{2}:\d{2}$/)
  .nullable()
  .optional();

export const scheduleAssistantCapabilityDirectionSchema = z.enum(
  SCHEDULE_ASSISTANT_CAPABILITY_DIRECTIONS
);

export const scheduleAssistantAvailabilityDirectionSchema = z.enum(
  SCHEDULE_ASSISTANT_AVAILABILITY_DIRECTIONS
);

export const scheduleAssistantJoinDirectionSchema = z.enum(
  SCHEDULE_ASSISTANT_JOIN_DIRECTIONS
);

export const scheduleAssistantGroupDirectionSchema = z.enum(
  SCHEDULE_ASSISTANT_GROUP_DIRECTIONS
);

export const scheduleAssistantGroupSchema = z.object({
  id: z.string().trim().min(1).max(40).default("g1"),
  direction: scheduleAssistantGroupDirectionSchema,
  usernames: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  subject_names: z
    .array(z.string().trim().min(1).max(120))
    .max(40)
    .default([]),
  weekdays: z.array(z.enum(SCHEDULE_ASSISTANT_WEEKDAYS)).max(7).default([]),
  start_time: hhMmSchema,
  end_time: hhMmSchema,
});

export type ScheduleAssistantGroup = z.infer<typeof scheduleAssistantGroupSchema>;

export const scheduleAssistantGroupsResultSchema = z.object({
  groups: z.array(scheduleAssistantGroupSchema).min(1).max(6),
});

export type ScheduleAssistantGroupsResult = z.infer<
  typeof scheduleAssistantGroupsResultSchema
>;

/** Compact instructor row: id + username. */
export const scheduleAssistantCompactInstructorSchema = z.object({
  i: z.string().min(1),
  u: z.string().min(1),
});

/** Capability matrix row: username → subject names. */
export const scheduleAssistantCompactMatrixRowSchema = z.object({
  u: z.string().min(1),
  sub: z.array(z.string().min(1)).max(40),
});

/** Compact free-slot row. */
export const scheduleAssistantCompactSlotSchema = z.object({
  i: z.string().min(1),
  u: z.string().min(1),
  d: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  w: z.enum(SCHEDULE_ASSISTANT_WEEKDAYS),
  s: z.string().regex(/^\d{2}:\d{2}$/),
  e: z.string().regex(/^\d{2}:\d{2}$/),
});

export const scheduleAssistantInstructorsCatalogSchema = z.object({
  instructors: z.array(scheduleAssistantCompactInstructorSchema),
  truncated: z.boolean().default(false),
  total: z.number().int().nonnegative(),
});

export const scheduleAssistantSubjectsCatalogSchema = z.object({
  subjects: z.array(z.string().min(1)).max(200),
  truncated: z.boolean().default(false),
  total: z.number().int().nonnegative(),
});

export const scheduleAssistantMatrixCatalogSchema = z.object({
  matrix: z.array(scheduleAssistantCompactMatrixRowSchema),
  truncated: z.boolean().default(false),
  total: z.number().int().nonnegative(),
});

export const scheduleAssistantSlotsCatalogSchema = z.object({
  slots: z.array(scheduleAssistantCompactSlotSchema),
  truncated: z.boolean().default(false),
  total: z.number().int().nonnegative(),
});

export type ScheduleAssistantCompactInstructor = z.infer<
  typeof scheduleAssistantCompactInstructorSchema
>;
export type ScheduleAssistantCompactMatrixRow = z.infer<
  typeof scheduleAssistantCompactMatrixRowSchema
>;
export type ScheduleAssistantCompactSlot = z.infer<
  typeof scheduleAssistantCompactSlotSchema
>;
export type ScheduleAssistantInstructorsCatalog = z.infer<
  typeof scheduleAssistantInstructorsCatalogSchema
>;
export type ScheduleAssistantSubjectsCatalog = z.infer<
  typeof scheduleAssistantSubjectsCatalogSchema
>;
export type ScheduleAssistantMatrixCatalog = z.infer<
  typeof scheduleAssistantMatrixCatalogSchema
>;
export type ScheduleAssistantSlotsCatalog = z.infer<
  typeof scheduleAssistantSlotsCatalogSchema
>;
