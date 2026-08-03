import type {
  ScheduleAssistantActiveRoute,
  ScheduleAssistantWeekday,
} from "@/lib/constants/schedule-assistant";
import { matchCatalogSubject } from "@/lib/manager/schedule-assistant/match-subject";
import { matchCatalogUsernames } from "@/lib/manager/schedule-assistant/match-username";
import type {
  ScheduleAssistantGroup,
  ScheduleAssistantHints,
} from "@/lib/validators/manager/schedule-assistant";
import type { ScheduleAssistantPrefetchCatalogs } from "@/types/schedule-assistant";

export type ExactFastPathHit = {
  skipped_llm2: true;
  groups: ScheduleAssistantGroup[];
};

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
 */
export function tryExactFastPath(input: {
  route: ScheduleAssistantActiveRoute;
  hints: ScheduleAssistantHints;
  catalogs: ScheduleAssistantPrefetchCatalogs;
}): ExactFastPathHit | null {
  const { route, hints, catalogs } = input;
  const usernames = matchCatalogUsernames(
    hints.username_tokens,
    catalogUsernames(catalogs)
  );
  const subjects = matchHintSubjects(
    hints.subject_tokens,
    catalogSubjects(catalogs)
  );
  const weekdays = hints.weekdays as ScheduleAssistantWeekday[];

  if (route === "capabilities") {
    const hasUser = usernames.length === 1;
    const hasSubjects = subjects.length >= 1;
    if (hasUser && hasSubjects) {
      return null;
    }
    if (hasUser) {
      return {
        skipped_llm2: true,
        groups: [
          {
            id: "g1",
            direction: "username_to_capability",
            usernames,
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
        groups: [
          {
            id: "g1",
            direction: "capability_to_username",
            usernames: [],
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
    if (usernames.length === 0 && weekdays.length === 0) {
      return null;
    }
    return {
      skipped_llm2: true,
      groups: [
        {
          id: "g1",
          direction:
            usernames.length > 0 ? "username_to_slots" : "slots_to_username",
          usernames,
          subject_names: [],
          weekdays,
          start_time: null,
          end_time: null,
        },
      ],
    };
  }

  // capability_availability
  if (subjects.length === 0 && usernames.length === 0) {
    return null;
  }
  if (subjects.length === 0) {
    return null;
  }

  return {
    skipped_llm2: true,
    groups: [
      {
        id: "g1",
        direction: "subject_and_availability",
        usernames,
        subject_names: subjects,
        weekdays,
        start_time: null,
        end_time: null,
      },
    ],
  };
}
