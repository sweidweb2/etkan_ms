import { SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH } from "@/lib/constants/schedule-assistant";
import { SCHEDULE_ASSISTANT_MAP_CAPABILITIES_SYSTEM_PROMPT } from "@/lib/manager/schedule-assistant/system-prompt";
import { parseMapperGroupsResult } from "@/lib/manager/schedule-assistant/mappers/parse";
import type { ScheduleAssistantGroup } from "@/lib/validators/manager/schedule-assistant";
import type { ScheduleAssistantPrefetchCatalogs } from "@/types/schedule-assistant";

export function buildCapabilitiesMapperMessages(
  prompt: string,
  catalogs: ScheduleAssistantPrefetchCatalogs
): { system: string; user: string } {
  const catalog = {
    instructors: catalogs.instructors?.instructors ?? [],
    subjects: catalogs.subjects?.subjects ?? [],
    matrix: catalogs.matrix?.matrix ?? [],
  };
  return {
    system: SCHEDULE_ASSISTANT_MAP_CAPABILITIES_SYSTEM_PROMPT,
    user: `Q: ${prompt.slice(0, SCHEDULE_ASSISTANT_PROMPT_MAX_LENGTH)}\nCATALOG: ${JSON.stringify(catalog)}`,
  };
}

export function parseCapabilitiesMapperResult(
  raw: string | null | undefined
): ScheduleAssistantGroup[] {
  return parseMapperGroupsResult(raw, "capabilities");
}
