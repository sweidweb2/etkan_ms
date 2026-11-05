import type {
  ScheduleAssistantActiveRoute,
  ScheduleAssistantWeekday,
} from "@/lib/constants/schedule-assistant";
import { matchCatalogSubject } from "@/lib/manager/schedule-assistant/match-subject";
import {
  collectCatalogInstructors,
  matchCatalogInstructorNames,
} from "@/lib/manager/schedule-assistant/match-instructor-name";
import type {
  ScheduleAssistantGroup,
  ScheduleAssistantHints,
} from "@/lib/validators/manager/schedule-assistant";
import type {
  ScheduleAssistantInstructorAmbiguity,
  ScheduleAssistantPrefetchCatalogs,
} from "@/types/schedule-assistant";

export type ExactFastPathHit = {
  skipped_llm2: true;
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

function matchHintSubjects(
  tokens: string[],
  catalog: string[]
): string[] {
  const out: string[] = [];
  for (const token of tokens) {
    const hit = matchCatalogSubject(token, catalog);
    if (hit && !out.includes(hit)) {
      out.push(hit);
    }
  }
  return out;
}

/**
 * Build groups without LLM-2 when hints resolve onto catalog entries
 * and direction is unambiguous. Canonical DB strings only.
 * Ambiguous instructor names short-circuit with a clarification hit.
 */
export function tryExactFastPath(input: {
  route: ScheduleAssistantActiveRoute;
  hints: ScheduleAssistantHints;
  catalogs: ScheduleAssistantPrefetchCatalogs;
}): ExactFastPathHit | null {
  const { route, hints, catalogs } = input;
  const { instructors, ambiguities } = matchCatalogInstructorNames(
    hints.name_tokens,
    collectCatalogInstructors(catalogs)
  );
  if (ambiguities.length > 0) {
    return { skipped_llm2: true, groups: [], ambiguities };
  }

  const instructorNames = instructors.map((row) => row.u);
  const instructorIds = instructors.map((row) => row.i);
  const subjects = matchHintSubjects(
    hints.subject_tokens,
    catalogSubjects(catalogs)
  );
  const weekdays = hints.weekdays as ScheduleAssistantWeekday[];

  if (route === "capabilities") {
    const hasInstructor = instructors.length === 1;
    const hasSubjects = subjects.length >= 1;
    if (hasInstructor && hasSubjects) {
      return null;
    }
    if (hasInstructor) {
      return {
        skipped_llm2: true,
        ambiguities: [],
        groups: [
          {
            id: "g1",
            direction: "instructor_to_capability",
            instructor_names: instructorNames,
            instructor_ids: instructorIds,
            subject_names: [],
            weekdays: [],
            start_time: null,
            end_time: null,
          },
        ],
      };
    }
    if (hasSubjects) {
      return {
        skipped_llm2: true,
        ambiguities: [],
        groups: [
          {
            id: "g1",
            direction: "capability_to_instructor",
            instructor_names: [],
            instructor_ids: [],
            subject_names: subjects,
            weekdays: [],
            start_time: null,
            end_time: null,
          },
        ],
      };
    }
    return null;
  }

  if (route === "availability") {
    if (instructors.length === 0 && weekdays.length === 0) {
      return null;
    }
    return {
      skipped_llm2: true,
      ambiguities: [],
      groups: [
        {
          id: "g1",
          direction:
            instructors.length > 0
              ? "instructor_to_slots"
              : "slots_to_instructor",
          instructor_names: instructorNames,
          instructor_ids: instructorIds,
          subject_names: [],
          weekdays,
          start_time: null,
          end_time: null,
        },
      ],
    };
  }

  // capability_availability
  if (subjects.length === 0) {
    return null;
  }

  return {
    skipped_llm2: true,
    ambiguities: [],
    groups: [
      {
        id: "g1",
        direction: "subject_and_availability",
        instructor_names: instructorNames,
        instructor_ids: instructorIds,
        subject_names: subjects,
        weekdays,
        start_time: null,
        end_time: null,
      },
    ],
  };
}
