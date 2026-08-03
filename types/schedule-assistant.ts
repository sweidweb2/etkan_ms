import type { ScheduleAssistantToolName } from "@/lib/constants/schedule-assistant";

export type ScheduleAssistantSseEvent =
  | { type: "reasoning"; text: string }
  | { type: "tool_start"; name: ScheduleAssistantToolName | string; args?: unknown }
  | { type: "tool_result"; name: ScheduleAssistantToolName | string; summary: string }
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string }
  | { type: "refused"; message: string };

export type ScheduleAssistantInstructorMatch = {
  id: string;
  username: string;
  subjects: string[];
};

export type ScheduleAssistantFreeSlot = {
  instructor_id: string;
  instructor_username: string;
  slot_date: string;
  weekday: string;
  start_time: string;
  end_time: string;
  name: string;
};
