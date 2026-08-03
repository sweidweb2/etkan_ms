import { z } from "zod";
import {
  SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH,
  SCHEDULE_ASSISTANT_TOOL_NAMES,
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

export const searchInstructorsBySubjectArgsSchema = z.object({
  query: z.string().trim().min(1).max(120),
});

export type SearchInstructorsBySubjectArgs = z.infer<
  typeof searchInstructorsBySubjectArgsSchema
>;

export const listFreeSlotsForInstructorsArgsSchema = z.object({
  instructor_ids: z.array(z.string().uuid()).max(50).optional(),
  weekdays: z.array(z.enum(SCHEDULE_ASSISTANT_WEEKDAYS)).max(7).optional(),
  from_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export type ListFreeSlotsForInstructorsArgs = z.infer<
  typeof listFreeSlotsForInstructorsArgsSchema
>;

export const scheduleAssistantToolNameSchema = z.enum([
  SCHEDULE_ASSISTANT_TOOL_NAMES.SEARCH_INSTRUCTORS_BY_SUBJECT,
  SCHEDULE_ASSISTANT_TOOL_NAMES.LIST_FREE_SLOTS_FOR_INSTRUCTORS,
]);
