import type { ScheduleAssistantGroup } from "@/lib/validators/manager/schedule-assistant";
import type {
  ScheduleAssistantCompactInstructor,
  ScheduleAssistantCompactMatrixRow,
  ScheduleAssistantCompactSlot,
  ScheduleAssistantPrefetchCatalogs,
} from "@/types/schedule-assistant";

export type CapabilityResolveResult = {
  matches: ScheduleAssistantCompactMatrixRow[];
};

export type AvailabilityResolveResult = {
  slots: ScheduleAssistantCompactSlot[];
  instructors: ScheduleAssistantCompactInstructor[];
};

export type JoinResolveResult = {
  matches: ScheduleAssistantCompactMatrixRow[];
  slots: ScheduleAssistantCompactSlot[];
};

export type ScheduleAssistantResolvedFacts = {
  capabilities?: CapabilityResolveResult;
  availability?: AvailabilityResolveResult;
  join?: JoinResolveResult;
};

function subjectMatches(
  haystack: string[],
  needles: string[]
): boolean {
  if (needles.length === 0) {
    return false;
  }
  const lower = haystack.map((s) => s.toLowerCase());
  return needles.some((needle) => {
    const n = needle.toLowerCase();
    return lower.some((s) => s === n || s.includes(n) || n.includes(s));
  });
}

function timeOverlaps(
  slotStart: string,
  slotEnd: string,
  windowStart?: string | null,
  windowEnd?: string | null
): boolean {
  if (!windowStart && !windowEnd) {
    return true;
  }
  const s = slotStart.slice(0, 5);
  const e = slotEnd.slice(0, 5);
  if (windowStart && e <= windowStart) {
    return false;
  }
  if (windowEnd && s >= windowEnd) {
    return false;
  }
  return true;
}

function uniqueInstructors(
  rows: ScheduleAssistantCompactInstructor[]
): ScheduleAssistantCompactInstructor[] {
  const byId = new Map<string, ScheduleAssistantCompactInstructor>();
  for (const row of rows) {
    if (!byId.has(row.i)) {
      byId.set(row.i, { i: row.i, u: row.u });
    }
  }
  return [...byId.values()].sort(
    (a, b) => a.u.localeCompare(b.u) || a.i.localeCompare(b.i)
  );
}

export function filterSlots(
  slots: ScheduleAssistantCompactSlot[],
  group: ScheduleAssistantGroup
): ScheduleAssistantCompactSlot[] {
  const instructorFilter =
    group.instructor_ids.length > 0 ? new Set(group.instructor_ids) : null;
  const weekdayFilter =
    group.weekdays.length > 0 ? new Set(group.weekdays) : null;

  return slots.filter((slot) => {
    if (instructorFilter && !instructorFilter.has(slot.i)) {
      return false;
    }
    if (weekdayFilter && !weekdayFilter.has(slot.w as never)) {
      return false;
    }
    if (
      !timeOverlaps(slot.s, slot.e, group.start_time, group.end_time)
    ) {
      return false;
    }
    return true;
  });
}

export function resolveCapabilityGroup(
  group: ScheduleAssistantGroup,
  catalogs: ScheduleAssistantPrefetchCatalogs
): CapabilityResolveResult {
  const matrix = catalogs.matrix?.matrix ?? [];

  if (group.direction === "instructor_to_capability") {
    const wanted = new Set(group.instructor_ids);
    return {
      matches: matrix
        .filter((row) => wanted.has(row.i))
        .map((row) => ({
          i: row.i,
          u: row.u,
          sub: [...row.sub],
        })),
    };
  }

  if (group.direction === "capability_to_instructor") {
    return {
      matches: matrix
        .filter((row) => subjectMatches(row.sub, group.subject_names))
        .map((row) => ({
          i: row.i,
          u: row.u,
          sub: row.sub.filter((sub) =>
            subjectMatches([sub], group.subject_names)
          ),
        })),
    };
  }

  return { matches: [] };
}

export function resolveAvailabilityGroup(
  group: ScheduleAssistantGroup,
  catalogs: ScheduleAssistantPrefetchCatalogs
): AvailabilityResolveResult {
  const allSlots = catalogs.slots?.slots ?? [];

  if (
    group.direction === "instructor_to_slots" ||
    group.direction === "slots_to_instructor"
  ) {
    const slots = filterSlots(allSlots, group);
    return { slots, instructors: uniqueInstructors(slots) };
  }

  return { slots: [], instructors: [] };
}

export function resolveJoinGroup(
  group: ScheduleAssistantGroup,
  catalogs: ScheduleAssistantPrefetchCatalogs
): JoinResolveResult {
  const matrix = catalogs.matrix?.matrix ?? [];
  const allSlots = catalogs.slots?.slots ?? [];

  let matches = matrix;
  if (group.subject_names.length > 0) {
    matches = matches
      .filter((row) => subjectMatches(row.sub, group.subject_names))
      .map((row) => ({
        i: row.i,
        u: row.u,
        sub: row.sub.filter((sub) =>
          subjectMatches([sub], group.subject_names)
        ),
      }));
  } else if (group.instructor_ids.length === 0) {
    return { matches: [], slots: [] };
  }

  if (group.instructor_ids.length > 0) {
    const wanted = new Set(group.instructor_ids);
    matches = matches.filter((row) => wanted.has(row.i));
  }

  const matchIds = new Set(matches.map((row) => row.i));
  const slots = filterSlots(allSlots, {
    ...group,
    instructor_ids: [...matchIds],
  }).filter((slot) => matchIds.has(slot.i));

  const slotIds = new Set(slots.map((slot) => slot.i));
  matches = matches.filter((row) => slotIds.has(row.i));

  return { matches, slots };
}

export function resolveGroups(
  groups: ScheduleAssistantGroup[],
  catalogs: ScheduleAssistantPrefetchCatalogs
): ScheduleAssistantResolvedFacts {
  const facts: ScheduleAssistantResolvedFacts = {};

  for (const group of groups) {
    if (
      group.direction === "instructor_to_capability" ||
      group.direction === "capability_to_instructor"
    ) {
      const next = resolveCapabilityGroup(group, catalogs);
      facts.capabilities = {
        matches: [
          ...(facts.capabilities?.matches ?? []),
          ...next.matches,
        ],
      };
    } else if (
      group.direction === "instructor_to_slots" ||
      group.direction === "slots_to_instructor"
    ) {
      const next = resolveAvailabilityGroup(group, catalogs);
      facts.availability = {
        slots: [...(facts.availability?.slots ?? []), ...next.slots],
        instructors: uniqueInstructors([
          ...(facts.availability?.instructors ?? []),
          ...next.instructors,
        ]),
      };
    } else if (group.direction === "subject_and_availability") {
      const next = resolveJoinGroup(group, catalogs);
      facts.join = {
        matches: [...(facts.join?.matches ?? []), ...next.matches],
        slots: [...(facts.join?.slots ?? []), ...next.slots],
      };
    }
  }

  return facts;
}
