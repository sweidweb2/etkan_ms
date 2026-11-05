import type { ScheduleAssistantWeekday } from "@/lib/constants/schedule-assistant";
import { SCHEDULE_ASSISTANT_WEEKDAYS } from "@/lib/constants/schedule-assistant";
import { matchCatalogSubject } from "@/lib/manager/schedule-assistant/match-subject";
import {
  collectCatalogInstructors,
  matchCatalogInstructorName,
  mergeInstructorAmbiguities,
} from "@/lib/manager/schedule-assistant/match-instructor-name";
import type { ScheduleAssistantGroup } from "@/lib/validators/manager/schedule-assistant";
import type {
  ScheduleAssistantCompactInstructor,
  ScheduleAssistantInstructorAmbiguity,
  ScheduleAssistantPrefetchCatalogs,
} from "@/types/schedule-assistant";

export type ScrubGroupsResult = {
  groups: ScheduleAssistantGroup[];
  ambiguities: ScheduleAssistantInstructorAmbiguity[];
};

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
 * Resolve LLM/heuristic names onto catalog (DB) values and instructor ids.
 * Drop unknowns; report names matching several instructors.
 * Never invent instructors or subjects.
 */
export function scrubGroups(
  groups: ScheduleAssistantGroup[],
  catalogs: ScheduleAssistantPrefetchCatalogs
): ScrubGroupsResult {
  const instructors = collectCatalogInstructors(catalogs);
  const subjects = catalogSubjects(catalogs);
  const weekdaySet = new Set<string>(SCHEDULE_ASSISTANT_WEEKDAYS);
  let ambiguities: ScheduleAssistantInstructorAmbiguity[] = [];

  const scrubbed = groups.map((group, index) => {
    const resolvedInstructors = new Map<
      string,
      ScheduleAssistantCompactInstructor
    >();
    for (const name of group.instructor_names) {
      const match = matchCatalogInstructorName(name, instructors);
      if (match.status === "matched") {
        resolvedInstructors.set(match.instructor.i, match.instructor);
      } else if (match.status === "ambiguous") {
        ambiguities = mergeInstructorAmbiguities(ambiguities, [
          { phrase: name, candidates: match.candidates },
        ]);
      }
    }

    const resolvedSubjects = group.subject_names
      .map((name) => matchCatalogSubject(name, subjects))
      .filter((name): name is string => Boolean(name));

    const weekdays = group.weekdays.filter((day) =>
      weekdaySet.has(day)
    ) as ScheduleAssistantWeekday[];

    return {
      ...group,
      id: group.id || `g${index + 1}`,
      instructor_names: [
        ...new Set([...resolvedInstructors.values()].map((row) => row.u)),
      ],
      instructor_ids: [...resolvedInstructors.keys()],
      subject_names: [...new Set(resolvedSubjects)],
      weekdays: SCHEDULE_ASSISTANT_WEEKDAYS.filter((day) =>
        weekdays.includes(day)
      ),
    };
  });

  return { groups: scrubbed, ambiguities };
}
