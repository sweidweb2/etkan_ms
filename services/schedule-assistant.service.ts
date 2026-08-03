import { getDay } from "date-fns";
import {
  SCHEDULE_ASSISTANT_TOOL_NAMES,
  SCHEDULE_ASSISTANT_WEEKDAYS,
  type ScheduleAssistantWeekday,
} from "@/lib/constants/schedule-assistant";
import { ENTITY_SCHEDULE_TYPE_INSTRUCTOR } from "@/lib/validators/manager/instructor-schedule-slot";
import { weekdayFromYmd } from "@/lib/manager/schedule-assistant/intent";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  listFreeSlotsForInstructorsArgsSchema,
  searchInstructorsBySubjectArgsSchema,
  type ListFreeSlotsForInstructorsArgs,
  type SearchInstructorsBySubjectArgs,
} from "@/lib/validators/manager/schedule-assistant";
import * as instructorSubjectCapabilityRepository from "@/repositories/instructor-subject-capability.repository";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import {
  assertPermission,
} from "@/services/authorization.service";
import type {
  ScheduleAssistantFreeSlot,
  ScheduleAssistantInstructorMatch,
} from "@/types/schedule-assistant";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

function subjectMatchesQuery(subjectName: string, query: string): boolean {
  const name = subjectName.trim().toLowerCase();
  const q = query.trim().toLowerCase();
  if (!name || !q) {
    return false;
  }
  if (name.includes(q) || q.includes(name)) {
    return true;
  }
  const nameTokens = name.split(/[^a-z0-9+]+/).filter(Boolean);
  const queryTokens = q.split(/[^a-z0-9+]+/).filter(Boolean);
  return queryTokens.some(
    (token) =>
      token.length >= 2 &&
      nameTokens.some(
        (nameToken) => nameToken.includes(token) || token.includes(nameToken)
      )
  );
}

export async function searchInstructorsBySubjectQuery(
  adminClient: Supabase,
  actorUserId: string | null,
  rawArgs: unknown
): Promise<{ instructors: ScheduleAssistantInstructorMatch[] }> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  const parsed = searchInstructorsBySubjectArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new Error("Invalid search_instructors_by_subject arguments.");
  }

  return searchInstructorsBySubject(adminClient, parsed.data);
}

export async function searchInstructorsBySubject(
  adminClient: Supabase,
  args: SearchInstructorsBySubjectArgs
): Promise<{ instructors: ScheduleAssistantInstructorMatch[] }> {
  const [subjectsResult, capabilitiesResult, instructorsResult] =
    await Promise.all([
      subjectRepository.listSubjects(adminClient),
      instructorSubjectCapabilityRepository.listAllInstructorSubjectCapabilities(
        adminClient
      ),
      profileRepository.listInstructorProfiles(adminClient),
    ]);

  if (subjectsResult.error) {
    throw new Error(subjectsResult.error.message);
  }
  if (capabilitiesResult.error) {
    throw new Error(capabilitiesResult.error.message);
  }
  if (instructorsResult.error) {
    throw new Error(instructorsResult.error.message);
  }

  const matchedSubjects = (subjectsResult.data ?? []).filter((subject) =>
    subjectMatchesQuery(subject.name, args.query)
  );
  const matchedSubjectIds = new Set(matchedSubjects.map((s) => s.id));
  const subjectNameById = new Map(
    (subjectsResult.data ?? []).map((s) => [s.id, s.name] as const)
  );

  if (matchedSubjectIds.size === 0) {
    return { instructors: [] };
  }

  const instructorUsernameById = new Map(
    (instructorsResult.data ?? []).map(
      (profile) => [profile.id, profile.username ?? "Unknown"] as const
    )
  );

  const subjectsByInstructor = new Map<string, Set<string>>();
  for (const pair of capabilitiesResult.data ?? []) {
    if (!matchedSubjectIds.has(pair.subject_id)) {
      continue;
    }
    if (!instructorUsernameById.has(pair.user_id)) {
      continue;
    }
    const subjectName = subjectNameById.get(pair.subject_id);
    if (!subjectName) {
      continue;
    }
    const set = subjectsByInstructor.get(pair.user_id) ?? new Set<string>();
    set.add(subjectName);
    subjectsByInstructor.set(pair.user_id, set);
  }

  const instructors: ScheduleAssistantInstructorMatch[] = [
    ...subjectsByInstructor.entries(),
  ]
    .map(([id, subjects]) => ({
      id,
      username: instructorUsernameById.get(id) ?? "Unknown",
      subjects: [...subjects].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.username.localeCompare(b.username));

  return { instructors };
}

export async function listFreeSlotsForInstructorsQuery(
  adminClient: Supabase,
  actorUserId: string | null,
  rawArgs: unknown
): Promise<{ slots: ScheduleAssistantFreeSlot[] }> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  const parsed = listFreeSlotsForInstructorsArgsSchema.safeParse(rawArgs);
  if (!parsed.success) {
    throw new Error("Invalid list_free_slots_for_instructors arguments.");
  }

  return listFreeSlotsForInstructors(adminClient, parsed.data);
}

export async function listFreeSlotsForInstructors(
  adminClient: Supabase,
  args: ListFreeSlotsForInstructorsArgs
): Promise<{ slots: ScheduleAssistantFreeSlot[] }> {
  const [slotsResult, instructorsResult] = await Promise.all([
    instructorScheduleSlotRepository.listInstructorScheduleSlotsByEntity(
      adminClient,
      ENTITY_SCHEDULE_TYPE_INSTRUCTOR
    ),
    profileRepository.listInstructorProfiles(adminClient),
  ]);

  if (slotsResult.error) {
    throw new Error(slotsResult.error.message);
  }
  if (instructorsResult.error) {
    throw new Error(instructorsResult.error.message);
  }

  const instructorUsernameById = new Map(
    (instructorsResult.data ?? []).map(
      (profile) => [profile.id, profile.username ?? "Unknown"] as const
    )
  );

  const instructorIdFilter =
    args.instructor_ids && args.instructor_ids.length > 0
      ? new Set(args.instructor_ids)
      : null;
  const weekdayFilter =
    args.weekdays && args.weekdays.length > 0
      ? new Set(args.weekdays)
      : null;

  const slots: ScheduleAssistantFreeSlot[] = [];

  for (const slot of slotsResult.data ?? []) {
    if (slot.type !== "free") {
      continue;
    }
    if (instructorIdFilter && !instructorIdFilter.has(slot.record_id)) {
      continue;
    }
    if (args.from_date && slot.slot_date < args.from_date) {
      continue;
    }
    if (args.to_date && slot.slot_date > args.to_date) {
      continue;
    }

    const weekday = weekdayFromYmd(slot.slot_date);
    if (weekdayFilter && !weekdayFilter.has(weekday)) {
      continue;
    }

    if (!instructorUsernameById.has(slot.record_id)) {
      continue;
    }

    slots.push({
      instructor_id: slot.record_id,
      instructor_username: instructorUsernameById.get(slot.record_id)!,
      slot_date: slot.slot_date,
      weekday,
      start_time: slot.start_time.slice(0, 5),
      end_time: slot.end_time.slice(0, 5),
      name: slot.name,
    });
  }

  slots.sort((a, b) => {
    const byDate = a.slot_date.localeCompare(b.slot_date);
    if (byDate !== 0) {
      return byDate;
    }
    const byStart = a.start_time.localeCompare(b.start_time);
    if (byStart !== 0) {
      return byStart;
    }
    return a.instructor_username.localeCompare(b.instructor_username);
  });

  return { slots };
}

export async function executeScheduleAssistantTool(
  adminClient: Supabase,
  actorUserId: string | null,
  name: string,
  args: unknown
): Promise<{ result: unknown; summary: string }> {
  if (name === SCHEDULE_ASSISTANT_TOOL_NAMES.SEARCH_INSTRUCTORS_BY_SUBJECT) {
    const result = await searchInstructorsBySubjectQuery(
      adminClient,
      actorUserId,
      args
    );
    return {
      result,
      summary: `Found ${result.instructors.length} instructor(s).`,
    };
  }

  if (name === SCHEDULE_ASSISTANT_TOOL_NAMES.LIST_FREE_SLOTS_FOR_INSTRUCTORS) {
    const result = await listFreeSlotsForInstructorsQuery(
      adminClient,
      actorUserId,
      args
    );
    return {
      result,
      summary: `Found ${result.slots.length} free slot(s).`,
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

/** Exported for tests — keep weekday list stable. */
export function isScheduleAssistantWeekday(
  value: string
): value is ScheduleAssistantWeekday {
  return (SCHEDULE_ASSISTANT_WEEKDAYS as readonly string[]).includes(value);
}

/** Avoid unused import if tree-shaken oddly in tests. */
export function weekdayIndex(ymd: string): number {
  const [year, month, day] = ymd.split("-").map(Number);
  return getDay(new Date(year!, month! - 1, day!));
}
