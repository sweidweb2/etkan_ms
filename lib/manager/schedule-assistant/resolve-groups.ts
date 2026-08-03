import type { ScheduleAssistantGroup } from "@/lib/validators/manager/schedule-assistant";
import type {
  ScheduleAssistantCompactMatrixRow,
  ScheduleAssistantCompactSlot,
  ScheduleAssistantPrefetchCatalogs,
} from "@/types/schedule-assistant";

export type CapabilityResolveResult = {
  matches: ScheduleAssistantCompactMatrixRow[];
};

export type AvailabilityResolveResult = {
  slots: ScheduleAssistantCompactSlot[];
  usernames: string[];
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

export function filterSlots(
  slots: ScheduleAssistantCompactSlot[],
  group: ScheduleAssistantGroup
): ScheduleAssistantCompactSlot[] {
  const usernameFilter =
    group.usernames.length > 0
      ? new Set(group.usernames.map((u) => u.toLowerCase()))
      : null;
  const weekdayFilter =
    group.weekdays.length > 0 ? new Set(group.weekdays) : null;

  return slots.filter((slot) => {
    if (usernameFilter && !usernameFilter.has(slot.u.toLowerCase())) {
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

  if (group.direction === "username_to_capability") {
    const wanted = new Set(group.usernames.map((u) => u.toLowerCase()));
    return {
      matches: matrix
        .filter((row) => wanted.has(row.u.toLowerCase()))
        .map((row) => ({
          u: row.u,
          sub: [...row.sub],
        })),
    };
  }

  if (group.direction === "capability_to_username") {
    return {
      matches: matrix
        .filter((row) => subjectMatches(row.sub, group.subject_names))
        .map((row) => ({
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
  const slots = filterSlots(allSlots, group);

  if (group.direction === "username_to_slots") {
    return {
      slots,
      usernames: [
        ...new Set(slots.map((slot) => slot.u)),
      ],
    };
  }

  if (group.direction === "slots_to_username") {
    const usernames = [...new Set(slots.map((slot) => slot.u))].sort((a, b) =>
      a.localeCompare(b)
    );
    return { slots, usernames };
  }

  return { slots: [], usernames: [] };
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
        u: row.u,
        sub: row.sub.filter((sub) =>
          subjectMatches([sub], group.subject_names)
        ),
      }));
  } else if (group.usernames.length === 0) {
    return { matches: [], slots: [] };
  }

  if (group.usernames.length > 0) {
    const wanted = new Set(group.usernames.map((u) => u.toLowerCase()));
    matches = matches.filter((row) => wanted.has(row.u.toLowerCase()));
  }

  const matchUsernames = new Set(matches.map((row) => row.u.toLowerCase()));
  const slots = filterSlots(allSlots, {
    ...group,
    usernames: matches.map((row) => row.u),
  }).filter((slot) => matchUsernames.has(slot.u.toLowerCase()));

  const slotUsers = new Set(slots.map((slot) => slot.u.toLowerCase()));
  matches = matches.filter((row) => slotUsers.has(row.u.toLowerCase()));

  return { matches, slots };
}

export function resolveGroups(
  groups: ScheduleAssistantGroup[],
  catalogs: ScheduleAssistantPrefetchCatalogs
): ScheduleAssistantResolvedFacts {
  const facts: ScheduleAssistantResolvedFacts = {};

  for (const group of groups) {
    if (
      group.direction === "username_to_capability" ||
      group.direction === "capability_to_username"
    ) {
      const next = resolveCapabilityGroup(group, catalogs);
      facts.capabilities = {
        matches: [
          ...(facts.capabilities?.matches ?? []),
          ...next.matches,
        ],
      };
    } else if (
      group.direction === "username_to_slots" ||
      group.direction === "slots_to_username"
    ) {
      const next = resolveAvailabilityGroup(group, catalogs);
      facts.availability = {
        slots: [...(facts.availability?.slots ?? []), ...next.slots],
        usernames: [
          ...new Set([
            ...(facts.availability?.usernames ?? []),
            ...next.usernames,
          ]),
        ],
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
