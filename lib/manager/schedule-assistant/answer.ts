import { formatAnswerFromFacts } from "@/lib/manager/schedule-assistant/format-answer";
import {
  resolveGroups,
  type ScheduleAssistantResolvedFacts,
} from "@/lib/manager/schedule-assistant/resolve-groups";
import type { ScheduleAssistantGroup } from "@/lib/validators/manager/schedule-assistant";
import type { ScheduleAssistantPrefetchCatalogs } from "@/types/schedule-assistant";

/**
 * Resolve scrubbed groups against catalogs, then format a deterministic answer.
 */
export function buildAnswerFromGroups(
  groups: ScheduleAssistantGroup[],
  catalogs: ScheduleAssistantPrefetchCatalogs
): {
  facts: ScheduleAssistantResolvedFacts;
  answer: string;
} {
  const facts = resolveGroups(groups, catalogs);
  return {
    facts,
    answer: formatAnswerFromFacts(facts),
  };
}
