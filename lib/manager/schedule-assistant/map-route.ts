import type { ScheduleAssistantActiveRoute } from "@/lib/constants/schedule-assistant";
import { tryExactFastPath } from "@/lib/manager/schedule-assistant/fast-path";
import { scrubGroups } from "@/lib/manager/schedule-assistant/scrub";
import {
  parseAvailabilityMapperResult,
  buildAvailabilityMapperMessages,
} from "@/lib/manager/schedule-assistant/mappers/availability";
import {
  parseCapabilitiesMapperResult,
  buildCapabilitiesMapperMessages,
} from "@/lib/manager/schedule-assistant/mappers/capabilities";
import {
  parseJoinMapperResult,
  buildJoinMapperMessages,
} from "@/lib/manager/schedule-assistant/mappers/join";
import type {
  ScheduleAssistantGroup,
  ScheduleAssistantHints,
} from "@/lib/validators/manager/schedule-assistant";
import type { ScheduleAssistantPrefetchCatalogs } from "@/types/schedule-assistant";

export type MapperKind = "capabilities" | "availability" | "join";

export type MapGroupsResult =
  | {
      skipped_llm2: true;
      groups: ScheduleAssistantGroup[];
      mapperKind: MapperKind;
    }
  | {
      skipped_llm2: false;
      groups: null;
      mapperKind: MapperKind;
    };

function mapperKindForRoute(route: ScheduleAssistantActiveRoute): MapperKind {
  if (route === "capabilities") {
    return "capabilities";
  }
  if (route === "availability") {
    return "availability";
  }
  return "join";
}

/**
 * Prefer exact fast-path. On miss, Phase 5 should call LLM-2 with the
 * matching mapper message builder, then `finalizeMapperGroups`.
 */
export function mapGroupsForRoute(input: {
  route: ScheduleAssistantActiveRoute;
  hints: ScheduleAssistantHints;
  catalogs: ScheduleAssistantPrefetchCatalogs;
}): MapGroupsResult {
  const mapperKind = mapperKindForRoute(input.route);
  const fast = tryExactFastPath(input);
  if (fast) {
    return {
      skipped_llm2: true,
      groups: scrubGroups(fast.groups, input.catalogs),
      mapperKind,
    };
  }
  return { skipped_llm2: false, groups: null, mapperKind };
}

export function finalizeMapperGroups(input: {
  route: ScheduleAssistantActiveRoute;
  raw: string | null | undefined;
  catalogs: ScheduleAssistantPrefetchCatalogs;
}): ScheduleAssistantGroup[] {
  const { route, raw, catalogs } = input;
  let groups: ScheduleAssistantGroup[];
  if (route === "capabilities") {
    groups = parseCapabilitiesMapperResult(raw);
  } else if (route === "availability") {
    groups = parseAvailabilityMapperResult(raw);
  } else {
    groups = parseJoinMapperResult(raw);
  }
  return scrubGroups(groups, catalogs);
}

export function buildMapperMessagesForRoute(
  route: ScheduleAssistantActiveRoute,
  prompt: string,
  catalogs: ScheduleAssistantPrefetchCatalogs
): { system: string; user: string } {
  if (route === "capabilities") {
    return buildCapabilitiesMapperMessages(prompt, catalogs);
  }
  if (route === "availability") {
    return buildAvailabilityMapperMessages(prompt, catalogs);
  }
  return buildJoinMapperMessages(prompt, catalogs);
}
