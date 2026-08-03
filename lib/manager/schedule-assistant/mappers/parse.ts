import {
  SCHEDULE_ASSISTANT_AVAILABILITY_DIRECTIONS,
  SCHEDULE_ASSISTANT_CAPABILITY_DIRECTIONS,
  SCHEDULE_ASSISTANT_JOIN_DIRECTIONS,
  type ScheduleAssistantActiveRoute,
  type ScheduleAssistantGroupDirection,
} from "@/lib/constants/schedule-assistant";
import { extractJsonObject } from "@/lib/manager/schedule-assistant/router";
import {
  scheduleAssistantGroupsResultSchema,
  type ScheduleAssistantGroup,
} from "@/lib/validators/manager/schedule-assistant";

const CAPABILITY_DIRECTIONS = new Set<string>(
  SCHEDULE_ASSISTANT_CAPABILITY_DIRECTIONS
);
const AVAILABILITY_DIRECTIONS = new Set<string>(
  SCHEDULE_ASSISTANT_AVAILABILITY_DIRECTIONS
);
const JOIN_DIRECTIONS = new Set<string>(SCHEDULE_ASSISTANT_JOIN_DIRECTIONS);

export function allowedDirectionsForRoute(
  route: ScheduleAssistantActiveRoute
): Set<string> {
  if (route === "capabilities") {
    return CAPABILITY_DIRECTIONS;
  }
  if (route === "availability") {
    return AVAILABILITY_DIRECTIONS;
  }
  return JOIN_DIRECTIONS;
}

export function parseMapperGroupsResult(
  raw: string | null | undefined,
  route: ScheduleAssistantActiveRoute
): ScheduleAssistantGroup[] {
  const parsedJson = extractJsonObject(raw ?? "");
  const parsed = scheduleAssistantGroupsResultSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return [];
  }

  const allowed = allowedDirectionsForRoute(route);
  return parsed.data.groups.filter((group) =>
    allowed.has(group.direction as ScheduleAssistantGroupDirection)
  );
}
