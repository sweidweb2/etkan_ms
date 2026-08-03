import type { ScheduleAssistantWeekday } from "@/lib/constants/schedule-assistant";
import { SCHEDULE_ASSISTANT_WEEKDAYS } from "@/lib/constants/schedule-assistant";
import { matchCatalogSubject } from "@/lib/manager/schedule-assistant/match-subject";
import { matchCatalogUsername } from "@/lib/manager/schedule-assistant/match-username";
import type { ScheduleAssistantGroup } from "@/lib/validators/manager/schedule-assistant";
import type { ScheduleAssistantPrefetchCatalogs } from "@/types/schedule-assistant";

function catalogUsernames(
  catalogs: ScheduleAssistantPrefetchCatalogs
): string[] {
  const map = new Map<string, string>();
  for (const row of catalogs.instructors?.instructors ?? []) {
    map.set(row.u.toLowerCase(), row.u);
  }
  for (const row of catalogs.matrix?.matrix ?? []) {
    if (!map.has(row.u.toLowerCase())) {
      map.set(row.u.toLowerCase(), row.u);
    }
  }
  for (const slot of catalogs.slots?.slots ?? []) {
    if (!map.has(slot.u.toLowerCase())) {
      map.set(slot.u.toLowerCase(), slot.u);
    }
  }
  return [...map.values()];
}

function catalogSubjects(
  catalogs: ScheduleAssistantPrefetchCatalogs
): string[] {
  const map = new Map<string, string>();
  for (const name of catalogs.subjects?.subjects ?? []) {
    map.set(name.toLowerCase(), name);
  }
  for (const row of catalogs.matrix?.matrix ?? []) {
    for (const sub of row.sub) {
      map.set(sub.toLowerCase(), sub);
    }
  }
  return [...map.values()];
}

/**
 * Resolve LLM/heuristic names onto catalog (DB) values. Drop unknowns.
 * Never invent instructors or subjects.
 */
export function scrubGroups(
  groups: ScheduleAssistantGroup[],
  catalogs: ScheduleAssistantPrefetchCatalogs
): ScheduleAssistantGroup[] {
  const usernames = catalogUsernames(catalogs);
  const subjects = catalogSubjects(catalogs);
  const weekdaySet = new Set<string>(SCHEDULE_ASSISTANT_WEEKDAYS);

  return groups.map((group, index) => {
    const resolvedUsers = group.usernames
      .map((name) => matchCatalogUsername(name, usernames))
      .filter((name): name is string => Boolean(name));

    const resolvedSubjects = group.subject_names
      .map((name) => matchCatalogSubject(name, subjects))
      .filter((name): name is string => Boolean(name));

    const weekdays = group.weekdays.filter((day) =>
      weekdaySet.has(day)
    ) as ScheduleAssistantWeekday[];

    return {
      ...group,
      id: group.id || `g${index + 1}`,
      usernames: [...new Set(resolvedUsers)],
      subject_names: [...new Set(resolvedSubjects)],
      weekdays: SCHEDULE_ASSISTANT_WEEKDAYS.filter((day) =>
        weekdays.includes(day)
      ),
    };
  });
}
